-- Update the full_name in profiles table for Yesenia Farfán
UPDATE profiles
SET full_name = 'Yesenia Farfán'
WHERE user_id = '01d3b013-2e9e-43ba-915b-a8ea6c557c5c';

-- Update requester field in tickets table for this user
UPDATE tickets
SET requester = 'Yesenia Farfán'
WHERE created_by = '01d3b013-2e9e-43ba-915b-a8ea6c557c5c';