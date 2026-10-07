-- Safe SQL migration to ensure create_business RPC function exists in Supabase

CREATE OR REPLACE FUNCTION public.create_business(p_business_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_business_id UUID;
  v_membership_id UUID;
BEGIN
  -- Get current authenticated user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_business_name IS NULL OR TRIM(p_business_name) = '' THEN
    RAISE EXCEPTION 'Business name is required';
  END IF;

  -- Create business
  INSERT INTO public.businesses (name, owner_id, business_type, country)
  VALUES (TRIM(p_business_name), v_user_id, 'Supermarket', 'India')
  RETURNING id INTO v_business_id;

  -- Create business membership as OWNER
  INSERT INTO public.business_members (business_id, user_id, role)
  VALUES (v_business_id, v_user_id, 'OWNER')
  ON CONFLICT (business_id, user_id) DO UPDATE SET role = 'OWNER'
  RETURNING id INTO v_membership_id;

  RETURN jsonb_build_object(
    'success', true,
    'business_id', v_business_id,
    'membership_id', v_membership_id
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
