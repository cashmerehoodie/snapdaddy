-- Add google provider token to profiles for phone upload Google integration
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_provider_token TEXT;