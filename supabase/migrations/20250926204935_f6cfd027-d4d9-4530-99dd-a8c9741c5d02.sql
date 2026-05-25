-- Update Elida Mamani to Sheyla Zurita in profiles table
UPDATE public.profiles 
SET full_name = 'Sheyla Zurita'
WHERE full_name = 'Elida Mamani' AND email = 'recursoshumanos@livigui.com';