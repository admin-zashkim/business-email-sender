-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name VARCHAR(100),
    verified BOOLEAN DEFAULT false,
    verification_token TEXT,
    token_expiry TIMESTAMP,
    avatar VARCHAR(255) DEFAULT '/images/default-avatar.png',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    app_password_encrypted TEXT NOT NULL,
    sent_count INTEGER DEFAULT 0,
    max_emails INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email history table
CREATE TABLE email_history (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    recipient VARCHAR(255) NOT NULL,
    subject TEXT,
    body TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);