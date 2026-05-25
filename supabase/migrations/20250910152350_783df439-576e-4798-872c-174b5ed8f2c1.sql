-- Update the generate_ticket_code function to use the new TLA-COD-XXXX format
CREATE OR REPLACE FUNCTION public.generate_ticket_code(sede text, area text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    sede_code TEXT;
    area_code TEXT;
    correlativo INTEGER;
    new_code TEXT;
BEGIN
    -- Generate sede code: A for Arequipa, L for Lima
    sede_code := CASE sede
        WHEN 'Arequipa' THEN 'A'
        WHEN 'Lima' THEN 'L'
        ELSE 'A'  -- Default to Arequipa
    END;
    
    -- Generate area code (first 3 letters, uppercase)
    area_code := UPPER(LEFT(COALESCE(area, 'GEN'), 3));
    
    -- Get next correlativo number for this sede-area combination (4 digits now)
    SELECT COALESCE(MAX(
        CASE 
            WHEN code ~ ('TL' || sede_code || '-' || area_code || '-[0-9]+') 
            THEN CAST(SPLIT_PART(code, '-', 3) AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO correlativo
    FROM public.tickets
    WHERE code LIKE 'TL' || sede_code || '-' || area_code || '-%';
    
    -- Format the new code: TLA-COD-XXXX (4 digits for correlativo)
    new_code := 'TL' || sede_code || '-' || area_code || '-' || LPAD(correlativo::TEXT, 4, '0');
    
    RETURN new_code;
END;
$function$