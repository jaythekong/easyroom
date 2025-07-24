import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Background task for sending email
async function sendConfirmationEmail(user: any, emailData: any) {
  try {
    console.log("Starting background email send for:", user.email);
    
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }

    // Build confirmation URL
    const confirmationUrl = `${emailData.site_url}/auth/callback?token_hash=${emailData.token_hash}&type=${emailData.email_action_type}&redirect_to=${encodeURIComponent(emailData.redirect_to || '/')}`;
    
    console.log("Sending email to Resend API...");
    
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Union of Youth Federations <noreply@resend.dev>",
        to: [user.email],
        subject: "Confirm your email address",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Confirm your email</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin-bottom: 10px;">Welcome!</h1>
              <p style="font-size: 18px; color: #666;">Please confirm your email address to complete your registration</p>
            </div>
            
            <div style="background: #f8fafc; border-radius: 8px; padding: 30px; margin: 30px 0; text-align: center;">
              <p style="margin-bottom: 25px; font-size: 16px;">Click the button below to verify your email address:</p>
              
              <a href="${confirmationUrl}" 
                 style="display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Confirm Email Address
              </a>
            </div>
            
            <div style="margin: 30px 0; padding: 20px; border-left: 4px solid #fbbf24; background: #fffbeb;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>Alternative:</strong> If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="word-break: break-all; font-size: 12px; color: #92400e; margin: 10px 0 0 0;">
                ${confirmationUrl}
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 14px; color: #666; margin: 0;">
                If you didn't create an account, you can safely ignore this email.
              </p>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Resend API error:", response.status, errorText);
      throw new Error(`Resend API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log("✅ Email sent successfully via Resend:", result.id);
    return result;

  } catch (error) {
    console.error("❌ Failed to send confirmation email:", error);
    throw error;
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔔 Email confirmation hook triggered");
    
    const body = await req.json();
    const { user, email_data } = body;
    
    console.log("📧 Processing email for:", user.email);
    
    // Start background email task
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    EdgeRuntime.waitUntil(
      sendConfirmationEmail(user, email_data)
    );

    console.log("⚡ Response sent immediately, email processing in background");
    
    // Return immediately to prevent timeout
    return new Response(
      JSON.stringify({ success: true, message: "Email queued for sending" }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error("❌ Hook error:", error);
    
    // Still return success to prevent auth failure
    return new Response(
      JSON.stringify({ success: true, message: "Hook processed with error" }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
});