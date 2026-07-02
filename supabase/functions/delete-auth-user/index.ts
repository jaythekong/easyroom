import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeleteUserRequest {
  email?: string
  userId?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // --- Authorization: only super admins may delete users ---
    const authHeader = req.headers.get('Authorization')
    const callerToken = authHeader?.replace(/^Bearer\s+/i, '')
    if (!callerToken) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const { data: callerData, error: callerError } = await supabaseAdmin.auth.getUser(callerToken)
    const caller = callerData?.user
    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (caller.app_metadata?.super_admin !== true) {
      console.warn(`Delete-user denied for non-super-admin: ${caller.email} (${caller.id})`)
      return new Response(
        JSON.stringify({ error: 'Forbidden: super admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    // --- end authorization ---

    const { email, userId }: DeleteUserRequest = await req.json()

    if (!email && !userId) {
      throw new Error('Either email or userId is required')
    }

    console.log(`Starting deletion process for user: ${email || userId}`)

    let userToDeleteId: string
    let userToDeleteEmail: string

    // If email is provided, find the user by email
    if (email) {
      const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      
      if (listError) {
        console.error('Error fetching users:', listError)
        throw new Error('Failed to fetch user data')
      }

      const userToDelete = authUsers.users.find(user => user.email === email)
      
      if (!userToDelete) {
        throw new Error(`User with email ${email} not found`)
      }

      userToDeleteId = userToDelete.id
      userToDeleteEmail = userToDelete.email || email
    } else {
      userToDeleteId = userId!
      // Get email for logging
      const { data: authUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId!)
      if (getUserError) {
        console.error('Error fetching user:', getUserError)
        userToDeleteEmail = 'unknown'
      } else {
        userToDeleteEmail = authUser.user.email || 'unknown'
      }
    }

    console.log(`Found user with ID: ${userToDeleteId}, Email: ${userToDeleteEmail}`)

    // Delete related records from public schema tables in correct order
    const tablesToClean = [
      'invitation_audit_log',
      'platform_audit_log', 
      'telegram_subscriptions',
      'unauthorized_access_attempts',
      'room_downtime',
      'bookings',
      'user_profiles',
      'user_organization_memberships'
    ]

    for (const table of tablesToClean) {
      console.log(`Cleaning ${table}...`)
      
      const { error: deleteError } = await supabaseAdmin
        .from(table)
        .delete()
        .eq('user_id', userToDeleteId)

      if (deleteError) {
        console.error(`Error deleting from ${table}:`, deleteError)
        // Continue with other tables even if one fails
      } else {
        console.log(`Successfully cleaned ${table}`)
      }
    }

    // Clean invitation references (invited_by, sent_by, revoked_by)
    console.log('Cleaning invitation references...')
    
    const { error: inviteError1 } = await supabaseAdmin
      .from('invitations')
      .update({ invited_by: null })
      .eq('invited_by', userToDeleteId)
    
    const { error: inviteError2 } = await supabaseAdmin
      .from('invitations')
      .update({ sent_by: null })
      .eq('sent_by', userToDeleteId)
      
    const { error: inviteError3 } = await supabaseAdmin
      .from('invitations')
      .update({ revoked_by: null })
      .eq('revoked_by', userToDeleteId)

    if (inviteError1 || inviteError2 || inviteError3) {
      console.error('Error cleaning invitation references:', { inviteError1, inviteError2, inviteError3 })
    }

    // Finally, delete the user from auth.users (this will cascade to auth-related tables)
    console.log('Deleting user from auth system...')
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userToDeleteId)

    if (authDeleteError) {
      console.error('Error deleting user from auth:', authDeleteError)
      throw new Error(`Failed to delete user from auth system: ${authDeleteError.message}`)
    }

    console.log(`Successfully deleted user: ${userToDeleteEmail}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User ${userToDeleteEmail} has been completely removed from the database` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Delete user error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})