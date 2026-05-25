-- Update user profile for Sheyla Zurita
-- This update will bypass RLS as it's executed with elevated privileges during migration

UPDATE profiles
SET 
  full_name = 'Sheyla Zurita',
  updated_at = now()
WHERE user_id = 'a6c19e35-eeee-4396-8513-d99bb2bc41e5';

-- Verify the update was successful
DO $$
DECLARE
  updated_name text;
BEGIN
  SELECT full_name INTO updated_name
  FROM profiles
  WHERE user_id = 'a6c19e35-eeee-4396-8513-d99bb2bc41e5';
  
  IF updated_name = 'Sheyla Zurita' THEN
    RAISE NOTICE 'Profile successfully updated for user a6c19e35-eeee-4396-8513-d99bb2bc41e5';
  ELSE
    RAISE WARNING 'Profile update may have failed. Current name: %', updated_name;
  END IF;
END $$;