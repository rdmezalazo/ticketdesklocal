-- Update user profile name from Elida Mamani to Sheyla Zurita
UPDATE public.profiles 
SET full_name = 'Sheyla Zurita',
    updated_at = now()
WHERE user_id = 'a6c19e35-eeee-4396-8513-d99bb2bc41e5';