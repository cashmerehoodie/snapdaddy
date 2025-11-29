-- Fix critical RLS policies

-- 1. Fix profiles table - only allow users to view their own profile
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles 
  FOR SELECT USING (auth.uid() = user_id);

-- 2. Fix upload_sessions - only allow users to update their own sessions
DROP POLICY IF EXISTS "Anyone can update upload sessions" ON upload_sessions;
CREATE POLICY "Users can update own upload sessions" ON upload_sessions 
  FOR UPDATE USING (auth.uid() = user_id);

-- 3. Fix create_default_categories function - add search_path
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, emoji, color, is_default)
  VALUES
    (NEW.user_id, 'Food & Dining', '🍔', '#FF6B6B', true),
    (NEW.user_id, 'Transportation', '🚗', '#4ECDC4', true),
    (NEW.user_id, 'Shopping', '🛍️', '#95E1D3', true),
    (NEW.user_id, 'Entertainment', '🎬', '#F38181', true),
    (NEW.user_id, 'Bills & Utilities', '💡', '#AA96DA', true),
    (NEW.user_id, 'Healthcare', '🏥', '#FCBAD3', true),
    (NEW.user_id, 'Other', '📝', '#A8E6CF', true);
  RETURN NEW;
END;
$$;

-- 4. Make receipts storage bucket private (requires manual config via Lovable Cloud UI)
-- Note: This will be handled by updating storage policies

-- Update storage policies for receipts bucket
DROP POLICY IF EXISTS "Allow authenticated users to upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to view their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to receipts" ON storage.objects;

CREATE POLICY "Users can upload own receipts" ON storage.objects
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'receipts' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own receipts" ON storage.objects
  FOR SELECT 
  USING (
    bucket_id = 'receipts' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own receipts" ON storage.objects
  FOR DELETE 
  USING (
    bucket_id = 'receipts' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );