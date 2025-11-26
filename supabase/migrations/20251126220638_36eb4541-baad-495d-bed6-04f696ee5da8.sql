-- Add google_sheets_id column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS google_sheets_id TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN public.profiles.google_sheets_id IS 'The Google Sheets ID where receipt data should be synced';