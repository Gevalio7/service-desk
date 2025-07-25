const request = require('supertest');
const app = require('../app');
const { sequelize } = require('../../config/database');
const { User, Ticket } = require('../models');
const jwt = require('jsonwebtoken');

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

describe('Ticket API', () => {
  let adminToken, agentToken, clientToken;
  let adminUser, agentUser, clientUser;
  let testTicket;

  // Setup before tests
  beforeAll(async () => {
    // Sync database
    await sequelize.sync({ force: true });

    // Create test users
    adminUser = await User.create({
      username: 'admin',
      email: 'admin@test.com',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    });

    agentUser = await User.create({
      username: 'agent',
      email: 'agent@test.com',
      password: 'password123',
      firstName: 'Agent',
      lastName: 'User',
      role: 'agent'
    });

    clientUser = await User.create({
      username: 'client',
      email: 'client@test.com',
      password: 'password123',
      firstName: 'Client',
      lastName: 'User',
      role: 'client'
    });

    // Generate tokens
    adminToken = jwt.sign({ id: adminUser.id, role: adminUser.role }, JWT_SECRET);
    agentToken = jwt.sign({ id: agentUser.id, role: agentUser.role }, JWT_SECRET);
    clientToken = jwt.sign({ id: clientUser.id, role: clientUser.role }, JWT_SECRET);

    // Create test ticket
    testTicket = await Ticket.create({
      title: 'Test Ticket',
      description: 'This is a test ticket',
      category: 'request',
      priority: 'P3',
      status: 'new',
      createdById: clientUser.id
    });
  });

  // Cleanup after tests
  afterAll(async () => {
    await sequelize.close();
  });

  // Test GET /api/tickets
  describe('GET /api/tickets', () => {
    it('should return all tickets for admin', async () => {
      const res = await request(app)
        .get('/api/tickets')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.tickets).toBeDefined();
      expect(res.body.tickets.length).toBeGreaterThan(0);
    });

    it('should return only own tickets for client', async () => {
      const res = await request(app)
        .get('/api/tickets')
        .set('Authorization', `Bearer ${clientToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.tickets).toBeDefined();
      expect(res.body.tickets.length).toBeGreaterThan(0);
      
      // All tickets should belong to the client
      res.body.tickets.forEach(ticket => {
        expect(ticket.createdById).toEqual(clientUser.id);
      });
    });

    it('should filter tickets by status', async () => {
      const res = await request(app)
        .get('/api/tickets?status=new')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.tickets).toBeDefined();
      
      // All tickets should have status 'new'
      res.body.tickets.forEach(ticket => {
        expect(ticket.status).toEqual('new');
      });
    });
  });

  // Test GET /api/tickets/:id
  describe('GET /api/tickets/:id', () => {
    it('should return a ticket by ID for admin', async () => {
      const res = await request(app)
        .get(`/api/tickets/${testTicket.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.ticket).toBeDefined();
      expect(res.body.ticket.id).toEqual(testTicket.id);
    });

    it('should return a ticket by ID for its creator', async () => {
      const res = await request(app)
        .get(`/api/tickets/${testTicket.id}`)
        .set('Authorization', `Bearer ${clientToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.ticket).toBeDefined();
      expect(res.body.ticket.id).toEqual(testTicket.id);
    });

    it('should not return a ticket for another client', async () => {
      // Create another client
      const anotherClient = await User.create({
        username: 'client2',
        email: 'client2@test.com',
        password: 'password123',
        firstName: 'Another',
        lastName: 'Client',
        role: 'client'
      });

      const anotherClientToken = jwt.sign(
        { id: anotherClient.id, role: anotherClient.role },
        JWT_SECRET
      );

      const res = await request(app)
        .get(`/api/tickets/${testTicket.id}`)
        .set('Authorization', `Bearer ${anotherClientToken}`);
      
      expect(res.statusCode).toEqual(403);
    });
  });

  // Test POST /api/tickets
  describe('POST /api/tickets', () => {
    it('should create a new ticket', async () => {
      const newTicket = {
        title: 'New Test Ticket',
        description: 'This is a new test ticket',
        category: 'incident',
        priority: 'P2'
      };

      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(newTicket);
      
      expect(res.statusCode).toEqual(201);
      expect(res.body.ticket).toBeDefined();
      expect(res.body.ticket.title).toEqual(newTicket.title);
      expect(res.body.ticket.createdById).toEqual(clientUser.id);
    });

    it('should validate required fields', async () => {
      const invalidTicket = {
        // Missing title and description
        category: 'incident',
        priority: 'P2'
      };

      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(invalidTicket);
      
      expect(res.statusCode).toEqual(400);
    });
  });

  // Test PUT /api/tickets/:id
  describe('PUT /api/tickets/:id', () => {
    it('should update a ticket as admin', async () => {
      const updateData = {
        status: 'in_progress',
        priority: 'P1'
      };

      const res = await request(app)
        .put(`/api/tickets/${testTicket.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.ticket).toBeDefined();
      expect(res.body.ticket.status).toEqual(updateData.status);
      expect(res.body.ticket.priority).toEqual(updateData.priority);
    });

    it('should allow client to update only certain fields', async () => {
      const updateData = {
        title: 'Updated Title',
        description: 'Updated Description',
        status: 'resolved' // Client should not be able to update status
      };

      const res = await request(app)
        .put(`/api/tickets/${testTicket.id}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send(updateData);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.ticket).toBeDefined();
      expect(res.body.ticket.title).toEqual(updateData.title);
      expect(res.body.ticket.description).toEqual(updateData.description);
      expect(res.body.ticket.status).not.toEqual(updateData.status);
    });
  });

  // Test POST /api/tickets/:id/comments
  describe('POST /api/tickets/:id/comments', () => {
    it('should add a comment to a ticket', async () => {
      const commentData = {
        content: 'This is a test comment'
      };

      const res = await request(app)
        .post(`/api/tickets/${testTicket.id}/comments`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send(commentData);
      
      expect(res.statusCode).toEqual(201);
      expect(res.body.comment).toBeDefined();
      expect(res.body.comment.content).toEqual(commentData.content);
      expect(res.body.comment.userId).toEqual(agentUser.id);
    });

    it('should not allow internal comments from clients', async () => {
      const commentData = {
        content: 'This is an internal comment',
        isInternal: true
      };

      const res = await request(app)
        .post(`/api/tickets/${testTicket.id}/comments`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send(commentData);
      
      expect(res.statusCode).toEqual(403);
    });
  });

  // Test GET /api/tickets/metrics/sla
  describe('GET /api/tickets/metrics/sla', () => {
    it('should return SLA metrics for staff', async () => {
      const res = await request(app)
        .get('/api/tickets/metrics/sla')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.metrics).toBeDefined();
    });

    it('should not allow clients to access SLA metrics', async () => {
      const res = await request(app)
        .get('/api/tickets/metrics/sla')
        .set('Authorization', `Bearer ${clientToken}`);
      
      expect(res.statusCode).toEqual(403);
    });
  });
});