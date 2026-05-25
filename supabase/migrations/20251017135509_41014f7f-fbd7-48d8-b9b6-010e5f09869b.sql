-- Update profile and auth metadata for Sheyla Zurita to ensure persistence
-- This addresses the issue where changes were being reverted

-- First, update the auth.users metadata to prevent sync functions from overwriting
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{full_name}',
  '"Sheyla Zurita"'
)
WHERE id = 'a6c19e35-eeee-4396-8513-d99bb2bc41e5';

-- Then update the profiles table
UPDATE profiles
SET 
  full_name = 'Sheyla Zurita',
  updated_at = now()
WHERE user_id = 'a6c19e35-eeee-4396-8513-d99bb2bc41e5';

-- Verify both updates
DO $$
DECLARE
  profile_name text;
  auth_name text;
BEGIN
  -- Check profiles table
  SELECT full_name INTO profile_name
  FROM profiles
  WHERE user_id = 'a6c19e35-eeee-4396-8513-d99bb2bc41e5';
  
  -- Check auth.users metadata
  SELECT raw_user_meta_data->>'full_name' INTO auth_name
  FROM auth.users
  WHERE id = 'a6c19e35-eeee-4396-8513-d99bb2bc41e5';
  
  IF profile_name = 'Sheyla Zurita' AND auth_name = 'Sheyla Zurita' THEN
    RAISE NOTICE 'SUCCESS: Profile and auth metadata updated to Sheyla Zurita';
  ELSE
    RAISE WARNING 'MISMATCH: Profile name: %, Auth name: %', profile_name, auth_name;
  END IF;
END $$;