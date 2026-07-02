import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { targetUserId, orgSlug } = await req.json();
    
    if (!targetUserId || !orgSlug) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // --- Authorization: only super admins may impersonate ---
    const authHeader = req.headers.get('Authorization');
    const callerToken = authHeader?.replace(/^Bearer\s+/i, '');
    if (!callerToken) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { data: callerData, error: callerError } = await supabaseAdmin.auth.getUser(callerToken);
    const caller = callerData?.user;
    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (caller.app_metadata?.super_admin !== true) {
      console.warn(`Impersonation denied for non-super-admin: ${caller.email} (${caller.id})`);
      return new Response(
        JSON.stringify({ error: 'Forbidden: super admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // --- end authorization ---

    // Get the target user's email
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
    
    if (userError || !userData.user) {
      console.error('Error fetching user:', userError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a magic link for the target user
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email!,
    });

    if (linkError || !linkData.properties?.action_link) {
      console.error('Error generating magic link:', linkError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate impersonation link' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract the access and refresh tokens from the magic link
    const url = new URL(linkData.properties.action_link);
    const accessToken = url.searchParams.get('access_token');
    const refreshToken = url.searchParams.get('refresh_token');

    if (!accessToken || !refreshToken) {
      return new Response(
        JSON.stringify({ error: 'No tokens found in magic link' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return the tokens and redirect URL
    return new Response(
      JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        redirect_url: `/${orgSlug}`,
        success: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in handle-impersonation function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});