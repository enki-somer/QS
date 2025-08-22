-- Add partners role to existing database
-- Run this script to extend the user_role enum

-- First, add the new role to the enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'partners';

-- Now create the partners user
INSERT INTO users (username, password_hash, role, full_name, is_active, created_at)
VALUES (
    'partners',
    '$2a$10$YourHashedPasswordHere', -- This will be updated by the script
    'partners',
    'Partners User',
    true,
    CURRENT_TIMESTAMP
) ON CONFLICT (username) DO NOTHING;

-- Verify the role was added
SELECT unnest(enum_range(NULL::user_role)) as available_roles;
