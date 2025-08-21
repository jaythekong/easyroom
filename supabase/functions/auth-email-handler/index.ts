import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);
const hookSecret = Deno.env.get('AUTH_EMAIL_HOOK_SECRET') as string;

// Enhanced CORS headers with improved security
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://easyroom.asia',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface AuthEmailData {
  user: {
    id: string;
    email: string;
    created_at?: string;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);
    
    // Verify webhook signature if secret is provided
    if (hookSecret) {
      const wh = new Webhook(hookSecret);
      wh.verify(payload, headers);
    }

    const data = JSON.parse(payload) as AuthEmailData;
    const { user, email_data } = data;
    
    console.log(`Processing auth email for: ${user.email}, type: ${email_data.email_action_type}`);

    // Start email sending in background task to avoid timeout
    const emailTask = async () => {
      try {
        // Build the confirmation/action URL - use hash structure for better compatibility
        const actionUrl = `${email_data.site_url}/#token_hash=${email_data.token_hash}&type=${email_data.email_action_type}&redirect_to=${encodeURIComponent(email_data.redirect_to)}`;

        let subject = '';
        let htmlContent = '';

        switch (email_data.email_action_type) {
          case 'signup':
            subject = 'Confirm your email address';
            htmlContent = createSignupEmailHTML(user.email, actionUrl, email_data.token);
            break;
            
          case 'invite':
            subject = 'You\'ve been invited to join';
            htmlContent = createInviteEmailHTML(user.email, actionUrl, email_data.token);
            break;
            
          case 'magiclink':
            subject = 'Sign in to your account';
            htmlContent = createMagicLinkEmailHTML(user.email, actionUrl, email_data.token);
            break;
            
          case 'recovery':
            subject = 'Reset your password';
            htmlContent = createPasswordResetEmailHTML(user.email, actionUrl, email_data.token);
            break;
            
          case 'email_change':
            subject = 'Confirm your new email address';
            htmlContent = createEmailChangeEmailHTML(user.email, actionUrl, email_data.token);
            break;

          case 'reauthentication':
            subject = 'Confirm it\'s really you';
            htmlContent = createReauthEmailHTML(user.email, actionUrl, email_data.token);
            break;
            
          default:
            console.warn(`Unknown email action type: ${email_data.email_action_type}`);
            subject = 'Confirm your action';
            htmlContent = createGenericEmailHTML(user.email, actionUrl, email_data.token);
        }

        const { error } = await resend.emails.send({
          from: 'EasyRoom <noreply@easyroom.asia>',
          to: [user.email],
          subject: subject,
          html: htmlContent,
        });

        if (error) {
          console.error('Resend error:', error);
          throw error;
        }

        console.log(`✅ Email sent successfully to ${user.email} for ${email_data.email_action_type}`);
      } catch (emailError: any) {
        console.error('Background email task error:', emailError);
      }
    };

    // Use waitUntil to run email sending in background
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(emailTask());
    } else {
      // Fallback for local development - run in background with setTimeout
      setTimeout(() => emailTask(), 0);
    }

    // Return immediate success response to prevent timeout
    return new Response(JSON.stringify({ success: true, message: 'Email processing started' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error processing auth email webhook:', error);
    
    return new Response(JSON.stringify({
      error: {
        http_code: error.code || 500,
        message: error.message || 'Failed to process email request',
      },
    }), {
      status: error.code || 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

function createSignupEmailHTML(email: string, actionUrl: string, token: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm your email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2563eb; margin-bottom: 10px;">Welcome to EasyRoom! 🎉</h1>
    <p style="color: #666; font-size: 16px;">Please confirm your email address to get started</p>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin: 20px 0;">
    <p style="margin-bottom: 20px; font-size: 16px;">Hi there!</p>
    <p style="margin-bottom: 20px;">Thanks for signing up! Please click the button below to confirm your email address and activate your account:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${actionUrl}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Confirm Email Address</a>
    </div>
    
    <p style="margin-top: 30px; font-size: 14px; color: #666;">Or copy and paste this verification code:</p>
    <div style="background: #e5e7eb; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 18px; letter-spacing: 2px; text-align: center; margin: 10px 0;">${token}</div>
  </div>
  
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #666; font-size: 14px;">
    <p>If you didn't create an account, you can safely ignore this email.</p>
    <p style="margin-top: 20px;">
      <strong>EasyRoom</strong><br>
      Making room booking simple and efficient
    </p>
  </div>
</body>
</html>`;
}

function createInviteEmailHTML(email: string, actionUrl: string, token: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've been invited!</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2563eb; margin-bottom: 10px;">You're Invited! 🎉</h1>
    <p style="color: #666; font-size: 16px;">Join your team on EasyRoom</p>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin: 20px 0;">
    <p style="margin-bottom: 20px; font-size: 16px;">Hi there!</p>
    <p style="margin-bottom: 20px;">You've been invited to join an organization on EasyRoom. Click the button below to accept the invitation and set up your account:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${actionUrl}" style="background: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Accept Invitation</a>
    </div>
    
    <p style="margin-top: 30px; font-size: 14px; color: #666;">Or copy and paste this invitation code:</p>
    <div style="background: #e5e7eb; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 18px; letter-spacing: 2px; text-align: center; margin: 10px 0;">${token}</div>
  </div>
  
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #666; font-size: 14px;">
    <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
    <p style="margin-top: 20px;">
      <strong>EasyRoom</strong><br>
      Making room booking simple and efficient
    </p>
  </div>
</body>
</html>`;
}

function createMagicLinkEmailHTML(email: string, actionUrl: string, token: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to EasyRoom</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2563eb; margin-bottom: 10px;">Sign in to EasyRoom 🔐</h1>
    <p style="color: #666; font-size: 16px;">Your secure login link is ready</p>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin: 20px 0;">
    <p style="margin-bottom: 20px; font-size: 16px;">Hi there!</p>
    <p style="margin-bottom: 20px;">Click the button below to sign in to your EasyRoom account:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${actionUrl}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Sign In</a>
    </div>
    
    <p style="margin-top: 30px; font-size: 14px; color: #666;">Or copy and paste this login code:</p>
    <div style="background: #e5e7eb; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 18px; letter-spacing: 2px; text-align: center; margin: 10px 0;">${token}</div>
    
    <p style="margin-top: 20px; font-size: 14px; color: #dc2626;"><strong>This link will expire in 1 hour for security.</strong></p>
  </div>
  
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #666; font-size: 14px;">
    <p>If you didn't request this sign in link, you can safely ignore this email.</p>
    <p style="margin-top: 20px;">
      <strong>EasyRoom</strong><br>
      Making room booking simple and efficient
    </p>
  </div>
</body>
</html>`;
}

function createPasswordResetEmailHTML(email: string, actionUrl: string, token: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #dc2626; margin-bottom: 10px;">Reset Your Password 🔑</h1>
    <p style="color: #666; font-size: 16px;">Secure password reset for your EasyRoom account</p>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin: 20px 0;">
    <p style="margin-bottom: 20px; font-size: 16px;">Hi there!</p>
    <p style="margin-bottom: 20px;">We received a request to reset your password. Click the button below to create a new password:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${actionUrl}" style="background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Reset Password</a>
    </div>
    
    <p style="margin-top: 30px; font-size: 14px; color: #666;">Or copy and paste this reset code:</p>
    <div style="background: #e5e7eb; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 18px; letter-spacing: 2px; text-align: center; margin: 10px 0;">${token}</div>
    
    <p style="margin-top: 20px; font-size: 14px; color: #dc2626;"><strong>This reset link will expire in 1 hour for security.</strong></p>
  </div>
  
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #666; font-size: 14px;">
    <p>If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
    <p style="margin-top: 20px;">
      <strong>EasyRoom</strong><br>
      Making room booking simple and efficient
    </p>
  </div>
</body>
</html>`;
}

function createEmailChangeEmailHTML(email: string, actionUrl: string, token: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm your new email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2563eb; margin-bottom: 10px;">Confirm Email Change 📧</h1>
    <p style="color: #666; font-size: 16px;">Verify your new email address</p>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin: 20px 0;">
    <p style="margin-bottom: 20px; font-size: 16px;">Hi there!</p>
    <p style="margin-bottom: 20px;">You've requested to change your email address to <strong>${email}</strong>. Click the button below to confirm this change:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${actionUrl}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Confirm New Email</a>
    </div>
    
    <p style="margin-top: 30px; font-size: 14px; color: #666;">Or copy and paste this confirmation code:</p>
    <div style="background: #e5e7eb; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 18px; letter-spacing: 2px; text-align: center; margin: 10px 0;">${token}</div>
  </div>
  
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #666; font-size: 14px;">
    <p>If you didn't request this email change, please contact support immediately.</p>
    <p style="margin-top: 20px;">
      <strong>EasyRoom</strong><br>
      Making room booking simple and efficient
    </p>
  </div>
</body>
</html>`;
}

function createReauthEmailHTML(email: string, actionUrl: string, token: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm it's really you</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #f59e0b; margin-bottom: 10px;">Security Verification 🔒</h1>
    <p style="color: #666; font-size: 16px;">Confirm it's really you</p>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin: 20px 0;">
    <p style="margin-bottom: 20px; font-size: 16px;">Hi there!</p>
    <p style="margin-bottom: 20px;">For security reasons, we need to verify that it's really you. Click the button below to confirm your identity:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${actionUrl}" style="background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Verify Identity</a>
    </div>
    
    <p style="margin-top: 30px; font-size: 14px; color: #666;">Or copy and paste this verification code:</p>
    <div style="background: #e5e7eb; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 18px; letter-spacing: 2px; text-align: center; margin: 10px 0;">${token}</div>
    
    <p style="margin-top: 20px; font-size: 14px; color: #dc2626;"><strong>This verification link will expire soon for security.</strong></p>
  </div>
  
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #666; font-size: 14px;">
    <p>If you didn't request this verification, please contact support immediately.</p>
    <p style="margin-top: 20px;">
      <strong>EasyRoom</strong><br>
      Making room booking simple and efficient
    </p>
  </div>
</body>
</html>`;
}

function createGenericEmailHTML(email: string, actionUrl: string, token: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm your action</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2563eb; margin-bottom: 10px;">Confirm Your Action ✉️</h1>
    <p style="color: #666; font-size: 16px;">Please verify this action</p>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border-radius: 8px; margin: 20px 0;">
    <p style="margin-bottom: 20px; font-size: 16px;">Hi there!</p>
    <p style="margin-bottom: 20px;">Please click the button below to confirm your action:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${actionUrl}" style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Confirm Action</a>
    </div>
    
    <p style="margin-top: 30px; font-size: 14px; color: #666;">Or copy and paste this confirmation code:</p>
    <div style="background: #e5e7eb; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 18px; letter-spacing: 2px; text-align: center; margin: 10px 0;">${token}</div>
  </div>
  
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #666; font-size: 14px;">
    <p>If you didn't request this action, you can safely ignore this email.</p>
    <p style="margin-top: 20px;">
      <strong>EasyRoom</strong><br>
      Making room booking simple and efficient
    </p>
  </div>
</body>
</html>`;
}

serve(handler);