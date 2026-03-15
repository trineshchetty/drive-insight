-- Migration: Add user lifecycle fields for invitations and deactivation
-- Story: 1-4-user-invitation-profile-management

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_status VARCHAR(50) NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('invited', 'active', 'disabled')),
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ;

UPDATE users
SET
  account_status = 'active',
  must_change_password = false,
  activated_at = COALESCE(activated_at, created_at)
WHERE account_status IS DISTINCT FROM 'active'
   OR must_change_password IS DISTINCT FROM false
   OR activated_at IS NULL;

COMMENT ON COLUMN users.account_status IS
  'Invitation lifecycle status: invited, active, or disabled';
COMMENT ON COLUMN users.must_change_password IS
  'Whether the user must complete the first-login password change before normal use';
COMMENT ON COLUMN users.invited_at IS
  'Timestamp when the user invitation was issued or re-issued';
COMMENT ON COLUMN users.activated_at IS
  'Timestamp when the invited user completed first-login activation';
COMMENT ON COLUMN users.disabled_at IS
  'Timestamp when the user was deactivated instead of deleted';
