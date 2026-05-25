-- Update the display name in auth.users metadata for Yesenia Farfán
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{full_name}',
  '"Yesenia Farfán"'::jsonb
)
WHERE id = '01d3b013-2e9e-43ba-915b-a8ea6c557c5c';