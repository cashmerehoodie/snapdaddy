-- Add Microsoft integration fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS microsoft_access_token TEXT,
ADD COLUMN IF NOT EXISTS microsoft_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS microsoft_excel_workbook_id TEXT,
ADD COLUMN IF NOT EXISTS microsoft_onedrive_folder_path TEXT DEFAULT 'Documents/SnapDaddy Receipts';