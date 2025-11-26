-- Add google_drive_folder column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN google_drive_folder TEXT DEFAULT 'SnapDaddy Receipts';