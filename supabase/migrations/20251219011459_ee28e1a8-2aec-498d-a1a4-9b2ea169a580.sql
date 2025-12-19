-- Fix VIP codes enumeration vulnerability
-- Remove the overly permissive SELECT policy that allows any authenticated user to read all codes
DROP POLICY IF EXISTS "Users can check VIP codes" ON public.vip_codes;

-- The verify-access-code Edge Function already uses SERVICE_ROLE_KEY to bypass RLS
-- No client-side SELECT access is needed - RLS will now block all direct queries
-- This is the correct approach: validate codes server-side only