-- database.sql

-- Users table (for both teachers and students)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    full_name VARCHAR(255),
    user_type VARCHAR(50),
    student_id VARCHAR(50) UNIQUE,
    grade INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Organizations table
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    org_key VARCHAR(50) UNIQUE,
    contact_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service records table
CREATE TABLE service_records (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES users(id),
    hours INTEGER,
    service_type VARCHAR(50),
    description TEXT,
    date_completed DATE,
    assigned_by INTEGER REFERENCES users(id),
    organization_id INTEGER REFERENCES organizations(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);