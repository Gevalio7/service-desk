-- Create Users table
CREATE TABLE IF NOT EXISTS "Users" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "username" VARCHAR(255) NOT NULL UNIQUE,
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "password" VARCHAR(255) NOT NULL,
    "firstName" VARCHAR(255) NOT NULL,
    "lastName" VARCHAR(255) NOT NULL,
    "role" enum_Users_role DEFAULT 'client',
    "department" VARCHAR(255),
    "company" VARCHAR(255),
    "telegramId" VARCHAR(255) UNIQUE,
    "isActive" BOOLEAN DEFAULT true,
    "lastLogin" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create enum for ticket status
CREATE TYPE enum_Tickets_status AS ENUM ('new', 'assigned', 'in_progress', 'on_hold', 'resolved', 'closed');

-- Create enum for ticket priority
CREATE TYPE enum_Tickets_priority AS ENUM ('P1', 'P2', 'P3', 'P4');

-- Create enum for ticket category
CREATE TYPE enum_Tickets_category AS ENUM ('incident', 'request', 'problem', 'change');

-- Create enum for ticket source
CREATE TYPE enum_Tickets_source AS ENUM ('web', 'email', 'telegram', 'phone');

-- Create Tickets table
CREATE TABLE IF NOT EXISTS "Tickets" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "category" enum_Tickets_category DEFAULT 'request',
    "priority" enum_Tickets_priority DEFAULT 'P3',
    "status" enum_Tickets_status DEFAULT 'new',
    "slaDeadline" TIMESTAMP WITH TIME ZONE,
    "responseDeadline" TIMESTAMP WITH TIME ZONE,
    "firstResponseTime" TIMESTAMP WITH TIME ZONE,
    "resolutionTime" TIMESTAMP WITH TIME ZONE,
    "slaBreach" BOOLEAN DEFAULT false,
    "responseBreach" BOOLEAN DEFAULT false,
    "tags" TEXT[],
    "source" enum_Tickets_source DEFAULT 'web',
    "telegramMessageId" VARCHAR(255),
    "createdById" UUID NOT NULL REFERENCES "Users"("id"),
    "assignedToId" UUID REFERENCES "Users"("id"),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create Comments table
CREATE TABLE IF NOT EXISTS "Comments" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN DEFAULT false,
    "ticketId" UUID NOT NULL REFERENCES "Tickets"("id") ON DELETE CASCADE,
    "userId" UUID NOT NULL REFERENCES "Users"("id"),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create Attachments table
CREATE TABLE IF NOT EXISTS "Attachments" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "filename" VARCHAR(255) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(255) NOT NULL,
    "size" INTEGER NOT NULL,
    "path" VARCHAR(255) NOT NULL,
    "ticketId" UUID REFERENCES "Tickets"("id") ON DELETE CASCADE,
    "commentId" UUID REFERENCES "Comments"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create TicketHistory table
CREATE TABLE IF NOT EXISTS "TicketHistories" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "action" VARCHAR(255) NOT NULL,
    "field" VARCHAR(255),
    "oldValue" TEXT,
    "newValue" TEXT,
    "description" TEXT,
    "ticketId" UUID NOT NULL REFERENCES "Tickets"("id") ON DELETE CASCADE,
    "userId" UUID NOT NULL REFERENCES "Users"("id"),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create Notifications table
CREATE TABLE IF NOT EXISTS "Notifications" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "type" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN DEFAULT false,
    "userId" UUID NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_tickets_status" ON "Tickets"("status");
CREATE INDEX IF NOT EXISTS "idx_tickets_priority" ON "Tickets"("priority");
CREATE INDEX IF NOT EXISTS "idx_tickets_created_by" ON "Tickets"("createdById");
CREATE INDEX IF NOT EXISTS "idx_tickets_assigned_to" ON "Tickets"("assignedToId");
CREATE INDEX IF NOT EXISTS "idx_comments_ticket" ON "Comments"("ticketId");
CREATE INDEX IF NOT EXISTS "idx_attachments_ticket" ON "Attachments"("ticketId");
CREATE INDEX IF NOT EXISTS "idx_ticket_history_ticket" ON "TicketHistories"("ticketId");
CREATE INDEX IF NOT EXISTS "idx_notifications_user" ON "Notifications"("userId");