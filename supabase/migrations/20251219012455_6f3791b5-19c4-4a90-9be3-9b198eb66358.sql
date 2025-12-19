-- Make the receipts bucket private for better security
UPDATE storage.buckets SET public = false WHERE id = 'receipts';