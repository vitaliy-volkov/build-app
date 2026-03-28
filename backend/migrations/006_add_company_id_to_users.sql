-- Add company_id column to users table
-- Version: 1.0
-- Created: 2025-11-25

-- Add company_id column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_company_id_ref ON users(company_id) WHERE company_id IS NOT NULL;
