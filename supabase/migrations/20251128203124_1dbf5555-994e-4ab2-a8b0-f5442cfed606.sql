-- Allow duplicate category names per user by removing unique constraint
ALTER TABLE public.categories
DROP CONSTRAINT IF EXISTS categories_user_id_name_key;