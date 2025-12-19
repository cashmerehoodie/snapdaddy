-- Remove the overly permissive public access policy for receipts storage
DROP POLICY IF EXISTS "Anyone can view receipt images" ON storage.objects;