-- Fix the handle_new_user trigger to NOT overwrite manually edited profile data
-- This trigger was overwriting user data every time, preventing profile updates

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- New version: Only insert new profiles, never update existing ones
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    user_role_value public.user_role;
BEGIN
    -- Set default role
    user_role_value := 'usuario';
    
    -- Try to get role from metadata
    IF new.raw_user_meta_data ? 'role' THEN
        CASE new.raw_user_meta_data ->> 'role'
            WHEN 'gerencia' THEN user_role_value := 'gerencia';
            WHEN 'ti' THEN user_role_value := 'ti';
            ELSE user_role_value := 'usuario';
        END CASE;
    END IF;

    -- CRITICAL: Only INSERT new profiles, never UPDATE existing ones
    -- This prevents overwriting manually edited profile data
    INSERT INTO public.profiles (user_id, full_name, email, area, role)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data ->> 'full_name', 'Usuario'),
        new.email,
        COALESCE(new.raw_user_meta_data ->> 'area', 'General'),
        user_role_value
    )
    ON CONFLICT (user_id) DO NOTHING;  -- Changed from DO UPDATE to DO NOTHING
    
    RETURN new;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Create a secure function for updating user profiles by TI/Gerencia users
CREATE OR REPLACE FUNCTION public.update_user_profile(
    target_user_id uuid,
    new_full_name text,
    new_area text,
    new_cargo text DEFAULT NULL,
    new_sede text DEFAULT 'Arequipa',
    new_role user_role DEFAULT 'usuario'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    current_user_role user_role;
    updated_profile profiles%ROWTYPE;
BEGIN
    -- Get the current user's role
    SELECT role INTO current_user_role
    FROM profiles
    WHERE user_id = auth.uid();
    
    -- Check if user has permission (must be TI or gerencia)
    IF current_user_role NOT IN ('ti', 'gerencia') THEN
        RAISE EXCEPTION 'No tiene permisos para actualizar usuarios';
    END IF;
    
    -- Check if target user exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = target_user_id) THEN
        RAISE EXCEPTION 'Usuario no encontrado';
    END IF;
    
    -- Update the profile
    UPDATE profiles
    SET 
        full_name = new_full_name,
        area = new_area,
        cargo = new_cargo,
        sede = new_sede,
        role = new_role,
        updated_at = now()
    WHERE user_id = target_user_id
    RETURNING * INTO updated_profile;
    
    -- Return the updated profile as JSON
    RETURN json_build_object(
        'success', true,
        'user_id', updated_profile.user_id,
        'full_name', updated_profile.full_name,
        'area', updated_profile.area,
        'cargo', updated_profile.cargo,
        'sede', updated_profile.sede,
        'role', updated_profile.role
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_user_profile TO authenticated;

COMMENT ON FUNCTION public.update_user_profile IS 'Securely update user profiles. Only TI and gerencia users can call this function.';