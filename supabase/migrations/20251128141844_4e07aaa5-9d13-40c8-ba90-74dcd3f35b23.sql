-- Add refresh token column to profiles table for Google OAuth token refresh
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;