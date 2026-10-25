-- Migration 003: Add role column to users table and seed agent credentials
-- Travel Agency Management System (TAMS-39)

ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'customer';

INSERT OR IGNORE INTO users (email, password, full_name, role)
VALUES ('agent@voyara.com', 'agent123', 'Voyara Travel Agent', 'agent');
