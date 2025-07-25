const request = require('supertest');
const app = require('../app');
const { sequelize } = require('../../config/database');
const { User } = require('../models');
const jwt = require('jsonwebtoken');

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

describe('Authentication API', () => {
  // Setup before tests
  beforeAll(async () => {
    // Sync database
    await sequelize.sync({ force: true });
  });

  // Cleanup after tests
  afterAll(async () => {
    await sequelize.close();
  });

  // Test user registration
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'client'
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);
      
      expect(res.statusCode).toEqual(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.token).toBeDefined();
      expect(res.body.user.username).toEqual(userData.username);
      expect(res.body.user.email).toEqual(userData.email);
      expect(res.body.user.password).toBeUndefined(); // Password should not be returned
    });

    it('should not register a user with existing email', async () => {
      const userData = {
        username: 'anotheruser',
        email: 'test@example.com', // Same email as previous test
        password: 'password123',
        firstName: 'Another',
        lastName: 'User',
        role: 'client'
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);
      
      expect(res.statusCode).toEqual(400);
    });

    it('should validate required fields', async () => {
      const invalidUserData = {
        // Missing username, email, and password
        firstName: 'Invalid',
        lastName: 'User'
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(invalidUserData);
      
      expect(res.statusCode).toEqual(400);
    });
  });

  // Test user login
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const res = await request(app)
        .post('/api/auth/login')
        .send(loginData);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toEqual(loginData.email);
    });

    it('should not login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const res = await request(app)
        .post('/api/auth/login')
        .send(loginData);
      
      expect(res.statusCode).toEqual(401);
    });

    it('should not login with invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const res = await request(app)
        .post('/api/auth/login')
        .send(loginData);
      
      expect(res.statusCode).toEqual(401);
    });
  });

  // Test user profile
  describe('GET /api/auth/profile', () => {
    let token;

    beforeAll(async () => {
      // Create a test user
      const user = await User.create({
        username: 'profileuser',
        email: 'profile@example.com',
        password: 'password123',
        firstName: 'Profile',
        lastName: 'User',
        role: 'client'
      });

      // Generate token
      token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
    });

    it('should get user profile with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toEqual('profile@example.com');
      expect(res.body.user.password).toBeUndefined(); // Password should not be returned
    });

    it('should not get profile without token', async () => {
      const res = await request(app)
        .get('/api/auth/profile');
      
      expect(res.statusCode).toEqual(401);
    });

    it('should not get profile with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalidtoken');
      
      expect(res.statusCode).toEqual(401);
    });
  });

  // Test profile update
  describe('PUT /api/auth/profile', () => {
    let token, userId;

    beforeAll(async () => {
      // Create a test user
      const user = await User.create({
        username: 'updateuser',
        email: 'update@example.com',
        password: 'password123',
        firstName: 'Update',
        lastName: 'User',
        role: 'client'
      });

      userId = user.id;

      // Generate token
      token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
    });

    it('should update user profile', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        department: 'IT',
        company: 'Test Company'
      };

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.firstName).toEqual(updateData.firstName);
      expect(res.body.user.lastName).toEqual(updateData.lastName);
      expect(res.body.user.department).toEqual(updateData.department);
      expect(res.body.user.company).toEqual(updateData.company);

      // Verify in database
      const updatedUser = await User.findByPk(userId);
      expect(updatedUser.firstName).toEqual(updateData.firstName);
    });

    it('should not update email or username', async () => {
      const updateData = {
        email: 'newemail@example.com',
        username: 'newusername'
      };

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);
      
      expect(res.statusCode).toEqual(200);
      
      // Verify in database that email and username didn't change
      const updatedUser = await User.findByPk(userId);
      expect(updatedUser.email).toEqual('update@example.com');
      expect(updatedUser.username).toEqual('updateuser');
    });
  });
});