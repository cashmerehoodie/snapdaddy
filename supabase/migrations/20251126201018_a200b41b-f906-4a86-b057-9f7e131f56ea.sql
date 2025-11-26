-- Update the receipts bucket to be public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'receipts';

-- Update storage policies to allow public access to receipt images
DROP POLICY IF EXISTS "Users can view their own receipt images" ON storage.objects;

CREATE POLICY "Anyone can view receipt images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'receipts');