-- Add active_until column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN active_until TIMESTAMP WITH TIME ZONE;