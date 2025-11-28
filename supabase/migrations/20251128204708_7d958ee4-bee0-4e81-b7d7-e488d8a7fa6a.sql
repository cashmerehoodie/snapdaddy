-- Add subscription fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS has_free_access boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS free_access_code text;

-- Create VIP access codes table
CREATE TABLE IF NOT EXISTS public.vip_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamp with time zone
);

-- Enable RLS on vip_codes
ALTER TABLE public.vip_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can check if a code exists (for verification)
CREATE POLICY "Users can check VIP codes"
ON public.vip_codes
FOR SELECT
TO authenticated
USING (true);

-- Policy: Only service role can insert/update/delete VIP codes
-- (This will be managed via edge functions or manually)