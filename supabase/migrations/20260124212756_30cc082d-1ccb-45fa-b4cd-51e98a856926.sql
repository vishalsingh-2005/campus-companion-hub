-- Update the handle_new_user function to NOT auto-assign admin role
-- Roles should only be assigned explicitly by admins or through the edge function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only create the profile, do NOT auto-assign any role
    -- Roles are managed explicitly by admins via the admin-create-user edge function
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
    
    RETURN NEW;
END;
$$;