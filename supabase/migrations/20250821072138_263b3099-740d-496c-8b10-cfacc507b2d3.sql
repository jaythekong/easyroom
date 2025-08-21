-- Function to safely delete an organization and all related data
CREATE OR REPLACE FUNCTION public.delete_organization(org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  org_record RECORD;
  affected_tables text[];
  deleted_counts jsonb := '{}';
BEGIN
  -- Verify caller is super admin
  IF NOT ((auth.jwt() -> 'app_metadata' ->> 'super_admin')::boolean = true) THEN
    RAISE EXCEPTION 'Only super admins can delete organizations';
  END IF;

  -- Get organization details
  SELECT * INTO org_record FROM organizations WHERE id = org_id;
  IF org_record.id IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  -- Delete in order to handle foreign key constraints
  -- Start with child tables and work up to parent tables
  
  -- Delete booking-related data
  WITH deleted_bookings AS (
    DELETE FROM bookings WHERE organization_id = org_id RETURNING id
  )
  SELECT jsonb_build_object('bookings', count(*)) INTO deleted_counts
  FROM deleted_bookings;

  -- Delete room-related data
  WITH deleted_room_downtime AS (
    DELETE FROM room_downtime WHERE organization_id = org_id RETURNING id
  )
  SELECT deleted_counts || jsonb_build_object('room_downtime', count(*)) INTO deleted_counts
  FROM deleted_room_downtime;

  WITH deleted_room_amenities AS (
    DELETE FROM room_amenities WHERE room_id IN (
      SELECT id FROM rooms WHERE organization_id = org_id
    ) RETURNING id
  )
  SELECT deleted_counts || jsonb_build_object('room_amenities', count(*)) INTO deleted_counts
  FROM deleted_room_amenities;

  WITH deleted_rooms AS (
    DELETE FROM rooms WHERE organization_id = org_id RETURNING id
  )
  SELECT deleted_counts || jsonb_build_object('rooms', count(*)) INTO deleted_counts
  FROM deleted_rooms;

  -- Delete user-related data
  WITH deleted_profiles AS (
    DELETE FROM user_profiles WHERE organization_id = org_id RETURNING id
  )
  SELECT deleted_counts || jsonb_build_object('user_profiles', count(*)) INTO deleted_counts
  FROM deleted_profiles;

  WITH deleted_memberships AS (
    DELETE FROM user_organization_memberships WHERE organization_id = org_id RETURNING id
  )
  SELECT deleted_counts || jsonb_build_object('user_memberships', count(*)) INTO deleted_counts
  FROM deleted_memberships;

  -- Delete organization-specific settings
  WITH deleted_welcome_settings AS (
    DELETE FROM welcome_screen_settings WHERE organization_id = org_id RETURNING id
  )
  SELECT deleted_counts || jsonb_build_object('welcome_settings', count(*)) INTO deleted_welcome_settings
  FROM deleted_welcome_settings;

  WITH deleted_ticker_messages AS (
    DELETE FROM ticker_messages WHERE organization_id = org_id RETURNING id
  )
  SELECT deleted_counts || jsonb_build_object('ticker_messages', count(*)) INTO deleted_counts
  FROM deleted_ticker_messages;

  WITH deleted_ticker_settings AS (
    DELETE FROM ticker_settings WHERE organization_id = org_id RETURNING id
  )
  SELECT deleted_counts || jsonb_build_object('ticker_settings', count(*)) INTO deleted_counts
  FROM deleted_ticker_settings;

  -- Delete amenities
  WITH deleted_amenities AS (
    DELETE FROM amenities WHERE organization_id = org_id RETURNING id
  )
  SELECT deleted_counts || jsonb_build_object('amenities', count(*)) INTO deleted_counts
  FROM deleted_amenities;

  -- Delete invitations
  WITH deleted_invitations AS (
    DELETE FROM invitations WHERE organization_id = org_id RETURNING id
  )
  SELECT deleted_counts || jsonb_build_object('invitations', count(*)) INTO deleted_counts
  FROM deleted_invitations;

  -- Delete telegram subscriptions
  WITH deleted_telegram AS (
    DELETE FROM telegram_subscriptions WHERE organization_id = org_id RETURNING id
  )
  SELECT deleted_counts || jsonb_build_object('telegram_subscriptions', count(*)) INTO deleted_counts
  FROM deleted_telegram;

  -- Delete audit logs
  WITH deleted_invitation_audit AS (
    DELETE FROM invitation_audit_log WHERE organization_id = org_id RETURNING id
  )
  SELECT deleted_counts || jsonb_build_object('invitation_audit_logs', count(*)) INTO deleted_counts
  FROM deleted_invitation_audit;

  WITH deleted_platform_audit AS (
    DELETE FROM platform_audit_log WHERE organization_id = org_id RETURNING id
  )
  SELECT deleted_counts || jsonb_build_object('platform_audit_logs', count(*)) INTO deleted_counts
  FROM deleted_platform_audit;

  -- Finally, delete the organization itself
  DELETE FROM organizations WHERE id = org_id;

  -- Log the deletion
  INSERT INTO platform_audit_log (
    user_id,
    organization_id,
    action,
    metadata
  ) VALUES (
    auth.uid(),
    org_id,
    'organization_deleted',
    jsonb_build_object(
      'organization_name', org_record.name,
      'organization_slug', org_record.slug,
      'deleted_data_counts', deleted_counts,
      'deleted_at', now()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'organization_name', org_record.name,
    'organization_slug', org_record.slug,
    'deleted_data_counts', deleted_counts
  );
END;
$function$;

-- Function to transfer organization ownership
CREATE OR REPLACE FUNCTION public.transfer_organization_ownership(org_id uuid, new_admin_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  org_record RECORD;
  new_admin_id uuid;
  current_admin_count integer;
  membership_exists boolean;
BEGIN
  -- Verify caller is super admin
  IF NOT ((auth.jwt() -> 'app_metadata' ->> 'super_admin')::boolean = true) THEN
    RAISE EXCEPTION 'Only super admins can transfer organization ownership';
  END IF;

  -- Get organization details
  SELECT * INTO org_record FROM organizations WHERE id = org_id;
  IF org_record.id IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  -- Find the new admin user by email
  SELECT id INTO new_admin_id 
  FROM auth.users 
  WHERE email = new_admin_email;
  
  IF new_admin_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', new_admin_email;
  END IF;

  -- Check if user is already a member of the organization
  SELECT EXISTS(
    SELECT 1 FROM user_organization_memberships 
    WHERE user_id = new_admin_id AND organization_id = org_id
  ) INTO membership_exists;

  -- If user is already a member, update their role to admin
  IF membership_exists THEN
    UPDATE user_organization_memberships 
    SET role = 'admin'::user_role, updated_at = now()
    WHERE user_id = new_admin_id AND organization_id = org_id;
    
    -- Update their profile role as well
    UPDATE user_profiles 
    SET role = 'admin'::user_role, updated_at = now()
    WHERE user_id = new_admin_id AND organization_id = org_id;
  ELSE
    -- Create new membership and profile for the new admin
    INSERT INTO user_organization_memberships (user_id, organization_id, role)
    VALUES (new_admin_id, org_id, 'admin'::user_role);
    
    INSERT INTO user_profiles (user_id, organization_id, role, email)
    VALUES (new_admin_id, org_id, 'admin'::user_role, new_admin_email);
  END IF;

  -- Count current admins after the update
  SELECT COUNT(*) INTO current_admin_count
  FROM user_organization_memberships 
  WHERE organization_id = org_id AND role = 'admin'::user_role;

  -- Log the ownership transfer
  INSERT INTO platform_audit_log (
    user_id,
    organization_id,
    action,
    metadata
  ) VALUES (
    auth.uid(),
    org_id,
    'ownership_transferred',
    jsonb_build_object(
      'new_admin_email', new_admin_email,
      'new_admin_id', new_admin_id,
      'organization_name', org_record.name,
      'was_existing_member', membership_exists,
      'total_admins_after_transfer', current_admin_count,
      'transferred_at', now()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'organization_name', org_record.name,
    'new_admin_email', new_admin_email,
    'was_existing_member', membership_exists,
    'total_admins', current_admin_count
  );
END;
$function$;