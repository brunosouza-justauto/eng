-- Script to update all existing profiles with null coach_id to use the default coach ID
-- Run this script via Supabase SQL Editor

-- Set the default coach ID
UPDATE public.profiles
SET coach_id = 'c5e342a9-28a3-4fdb-9947-fe9e76c46b65'
WHERE coach_id IS NULL;

-- Verify the update
SELECT id, email, coach_id
FROM public.profiles
WHERE coach_id = 'c5e342a9-28a3-4fdb-9947-fe9e76c46b65';

-- You should see the profiles that were updated and now have the default coach ID 