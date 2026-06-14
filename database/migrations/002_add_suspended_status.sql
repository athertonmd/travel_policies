-- Migration: 002_add_suspended_status
-- Project 2: Enterprise Management
-- Updates status constraints to include 'Suspended' per project requirements

-- Drop old constraints and recreate with Suspended status
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_status_check;
ALTER TABLE tenants ADD CONSTRAINT tenants_status_check
    CHECK (status IN ('Active', 'Suspended', 'Archived'));

ALTER TABLE enterprises DROP CONSTRAINT IF EXISTS enterprises_status_check;
ALTER TABLE enterprises ADD CONSTRAINT enterprises_status_check
    CHECK (status IN ('Active', 'Suspended', 'Archived'));

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check
    CHECK (status IN ('Active', 'Suspended', 'Archived'));
