-- Seed file for integration tests
-- Story 1.2: Tenant User Authentication (Login / Session)
--
-- This file seeds test tenants and users for integration testing
-- Run with: npx supabase db reset

-- Tenant A
INSERT INTO tenants (id, name, branch, status)
VALUES ('11111111-1111-1111-1111-111111111111', 'Dealership A', 'Main Branch', 'active')
ON CONFLICT (id) DO NOTHING;

-- Tenant B
INSERT INTO tenants (id, name, branch, status)
VALUES ('22222222-2222-2222-2222-222222222222', 'Dealership B', 'Downtown', 'active')
ON CONFLICT (id) DO NOTHING;

-- Note: Users must be created in Supabase Auth first, then inserted into users table
-- For manual testing, create users via Supabase Studio or admin API:
--
-- Example (using Supabase client):
-- const { data } = await supabase.auth.admin.createUser({
--   email: 'owner@dealershipa.com',
--   password: 'password123',
--   email_confirm: true,
-- });
--
-- Then insert into users table with the returned user.id
