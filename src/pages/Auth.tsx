import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Building, Users, Calendar, ArrowRight, Sparkles, Shield, Heart } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOrganizationTheme } from "@/hooks/useOrganizationTheme";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PasswordStrength } from "@/components/ui/password-strength";
import { logger } from "@/lib/logger";
import { 
  sanitizeInput, 
  sanitizeEmail, 
  sanitizeOrganizationSlug, 
  passwordSchema,
  emailSchema,
  organizationNameSchema
} from "@/lib/validation";
import { authRateLimiter, passwordResetRateLimiter } from "@/lib/rateLimiter";

const Auth = () => {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  
  // Only use organization context if we have an orgSlug (organization-specific auth)
  let organization = null;
  let orgLoading = false;
  
  if (orgSlug) {
    const orgContext = useOrganization();
    organization = orgContext.organization;
    orgLoading = orgContext.isLoading;
    useOrganizationTheme(); // Apply organization theme only if we're in org context
  }
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [orgSubdomain, setOrgSubdomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showUpdatePassword, setShowUpdatePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // New organization creation state
  const [orgCreationStep, setOrgCreationStep] = useState(1);
  const [orgType, setOrgType] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Auto-generate slug from organization name
  useEffect(() => {
    if (organizationName && !orgSlug) {
      const slug = organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setOrganizationSlug(slug);
    }
  }, [organizationName, orgSlug]);

  // Check for password reset parameter
  useEffect(() => {
    const resetParam = searchParams.get('reset');
    if (resetParam === 'true') {
      setShowUpdatePassword(true);
    }
  }, [searchParams]);

  useEffect(() => {
    // SECURITY FIX: Completely disable automatic redirects for org-specific auth
    // Users must explicitly sign in to prove they have access
    if (!orgSlug) return; // Don't redirect on /auth - allow new org creation
    
    const resetParam = searchParams.get('reset');
    if (resetParam === 'true') return; // Don't redirect during password reset
    
    // CRITICAL SECURITY: Do NOT auto-redirect signed-in users
    // They must go through the signin flow to verify organization access
    console.log('🔒 SECURITY: Auto-redirect disabled for organization-specific auth');
    
  }, [navigate, searchParams, orgSlug]);

  const handleOrganizationRedirect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const sanitizedSubdomain = sanitizeOrganizationSlug(orgSubdomain);
      
      if (!sanitizedSubdomain) {
        toast.error("Please enter a valid organization subdomain.");
        setLoading(false);
        return;
      }
      
      // Check if organization exists
      const { data, error } = await supabase
        .from('organizations')
        .select('slug')
        .eq('slug', sanitizedSubdomain)
        .maybeSingle();
      
      if (error) {
        console.error('Database error during organization lookup:', error);
        toast.error("An error occurred while searching for the organization.");
        logger.error('Organization lookup database error', { subdomain: sanitizedSubdomain, error });
        setLoading(false);
        return;
      }
      
      if (!data) {
        toast.error("Organization not found. Please check the subdomain and try again.");
        logger.security('Organization lookup failed', { subdomain: sanitizedSubdomain });
        setLoading(false);
        return;
      }
      
      // Redirect to organization auth page
      navigate(`/${sanitizedSubdomain}`);
    } catch (error) {
      logger.error("Organization redirect error:", error);
      toast.error("An error occurred while searching for the organization.");
    } finally {
      setLoading(false);
    }
  };

  const handleOrganizationSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Input validation and sanitization
      const sanitizedEmail = sanitizeEmail(email);
      const sanitizedOrgName = sanitizeInput(organizationName);
      const sanitizedSlug = sanitizeOrganizationSlug(organizationSlug);
      
      // Validate inputs
      const emailValidation = emailSchema.safeParse(sanitizedEmail);
      const passwordValidation = passwordSchema.safeParse(password);
      const orgNameValidation = organizationNameSchema.safeParse(sanitizedOrgName);
      
      if (!emailValidation.success) {
        toast.error(emailValidation.error.errors[0].message);
        return;
      }
      
      if (!passwordValidation.success) {
        toast.error(passwordValidation.error.errors[0].message);
        return;
      }
      
      if (!orgNameValidation.success) {
        toast.error(orgNameValidation.error.errors[0].message);
        return;
      }
      
      if (!sanitizedSlug) {
        toast.error("Organization slug cannot be empty.");
        return;
      }
      
      // Rate limiting check
      const rateLimitKey = `org-signup-${sanitizedEmail}`;
      if (!authRateLimiter.canAttempt(rateLimitKey)) {
        const remainingTime = authRateLimiter.getRemainingTime(rateLimitKey);
        toast.error(`Too many signup attempts. Try again in ${remainingTime} minutes.`);
        logger.security('Rate limit exceeded for organization signup', { email: sanitizedEmail });
        return;
      }
      
      authRateLimiter.recordAttempt(rateLimitKey);
      
      console.log('Step 3: Creating organization and user account');
      
      // Check if user is already authenticated
      const { data: { user } } = await supabase.auth.getUser();
      let authData;
      
      if (user) {
        // User is already authenticated, verify email matches
        if (user.email !== sanitizedEmail) {
          toast.error("Email mismatch. Please sign out and try again with the correct email.");
          return;
        }
        authData = { user };
      } else {
        // Create new user account - Supabase will handle duplicate email prevention
        const { data: newAuthData, error: authError } = await supabase.auth.signUp({
          email: sanitizedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/${sanitizedSlug}`
          }
        });
        
        if (authError) {
          if (authError.message.includes("already registered") || authError.message.includes("User already registered")) {
            toast.error("This email is already registered. Please sign in instead.");
          } else {
            toast.error(authError.message);
          }
          logger.security('Organization signup failed - possible duplicate email attempt', { error: authError.message, email: sanitizedEmail });
          return;
        }
        
        if (!newAuthData.user) {
          toast.error("Failed to create user account. Please try again.");
          return;
        }
        
        // Additional security check: ensure the created user email matches input
        if (newAuthData.user.email !== sanitizedEmail) {
          toast.error("Account creation failed - email verification error.");
          logger.security('Email mismatch during org creation', { 
            input: sanitizedEmail, 
            created: newAuthData.user.email 
          });
          return;
        }
        
        authData = newAuthData;
      }

      if (authData.user) {
        let orgData: any = null; // Declare orgData outside try block so it's accessible in catch
        
        try {
          // Step 1: Check if user already has an organization with this slug
          const { data: existingOrg } = await supabase
            .from('organizations')
            .select(`
              id, 
              name, 
              slug,
              user_organization_memberships!inner(user_id, role),
              user_profiles(id)
            `)
            .eq('slug', sanitizedSlug)
            .eq('user_organization_memberships.user_id', authData.user.id)
            .maybeSingle();
            
          if (existingOrg) {
            // User already has an organization with this slug
            if (existingOrg.user_profiles?.length > 0) {
              // Organization is complete, redirect to it
              toast.success("Organization already exists! Redirecting...");
              navigate(`/${sanitizedSlug}`);
              return;
            } else {
              // Organization exists but profile is missing, complete the setup
              orgData = existingOrg;
              console.log('Completing setup for existing organization:', orgData.id);
            }
          } else {
            // Check if slug is taken by someone else
            const { data: slugTaken } = await supabase
              .from('organizations')
              .select('slug')
              .eq('slug', sanitizedSlug)
              .maybeSingle();
              
            if (slugTaken) {
              toast.error("Organization slug already exists. Please choose a different name.");
              return;
            }
            
            // Create new organization
            const { data: createdOrgData, error: orgError } = await supabase
              .from('organizations')
              .insert({
                name: sanitizedOrgName,
                slug: sanitizedSlug,
                org_type: orgType,
                referral_source: referralSource
              })
              .select()
              .single();

            if (orgError) {
              if (orgError.message.includes('duplicate key')) {
                toast.error("Organization slug already exists. Please choose a different name.");
              } else {
                logger.error('Organization creation failed:', orgError);
                toast.error("Failed to create organization: " + orgError.message);
              }
              return;
            }
            
            orgData = createdOrgData;
          }
          
          // Step 2: Ensure user has membership (only create if doesn't exist)
          const { data: existingMembership } = await supabase
            .from('user_organization_memberships')
            .select('id')
            .eq('user_id', authData.user.id)
            .eq('organization_id', orgData.id)
            .maybeSingle();
          
          if (!existingMembership) {
            const { error: membershipError } = await supabase
              .from('user_organization_memberships')
              .insert({
                user_id: authData.user.id,
                organization_id: orgData.id,
                role: 'admin'
              });

            if (membershipError) {
              logger.error('Membership creation failed:', membershipError);
              toast.error("Failed to create user membership: " + membershipError.message);
              return;
            }
          }

          // Step 3: Ensure user has profile (only create if doesn't exist)
          const { data: existingProfile } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('user_id', authData.user.id)
            .eq('organization_id', orgData.id)
            .maybeSingle();
          
          if (!existingProfile) {
            // Use upsert to handle potential race conditions and duplicate key issues
            const { error: profileError } = await supabase
              .from('user_profiles')
              .upsert({
                user_id: authData.user.id,
                organization_id: orgData.id,
                email: sanitizedEmail,
                role: 'admin'
              }, {
                onConflict: 'user_id,organization_id'
              });

            if (profileError) {
              logger.error('Profile creation failed:', profileError);
              toast.error("Failed to create user profile: " + profileError.message);
              return;
            }
          }

        } catch (error) {
          // Rollback: Clean up any created records if something failed
          logger.error('Organization setup failed, cleaning up:', error);
          
          if (orgData?.id) {
            // Delete profile if it was created
            await supabase
              .from('user_profiles')
              .delete()
              .eq('user_id', authData.user.id)
              .eq('organization_id', orgData.id);
            
            // Delete membership if it was created
            await supabase
              .from('user_organization_memberships')
              .delete()
              .eq('user_id', authData.user.id)
              .eq('organization_id', orgData.id);
            
            // Delete the organization
            await supabase
              .from('organizations')
              .delete()
              .eq('id', orgData.id);
            
            logger.debug('Cleaned up orphaned organization and related records');
          }
          
          toast.error(error.message || "Failed to create organization. Please try again.");
          return;
        }

        logger.security('Organization created successfully', { 
          orgId: orgData.id, 
          userId: authData.user.id,
          email: sanitizedEmail 
        });
        
        // Always require email confirmation for proper verification
        toast.success("Organization created! Please check your email to confirm your account and access your organization.");
        
        // Store the organization slug for post-confirmation redirect
        localStorage.setItem('pendingOrgSlug', orgData.slug);
        
        // Note: User will be redirected automatically after email confirmation
      }
    } catch (error) {
      logger.error('Organization signup unexpected error:', error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // SECURITY: Block signup on org-specific auth pages
      if (orgSlug) {
        toast.error("Only invited users can sign up. Ask an admin for an invite link.");
        logger.security('Blocked signup attempt on org-specific auth', { orgSlug, email });
        return;
      }
      
      // Input validation and sanitization
      const sanitizedEmail = sanitizeEmail(email);
      
      const emailValidation = emailSchema.safeParse(sanitizedEmail);
      const passwordValidation = passwordSchema.safeParse(password);
      
      if (!emailValidation.success) {
        toast.error(emailValidation.error.errors[0].message);
        return;
      }
      
      if (!passwordValidation.success) {
        toast.error(passwordValidation.error.errors[0].message);
        return;
      }
      
      // Rate limiting check
      const rateLimitKey = `signup-${sanitizedEmail}`;
      if (!authRateLimiter.canAttempt(rateLimitKey)) {
        const remainingTime = authRateLimiter.getRemainingTime(rateLimitKey);
        toast.error(`Too many signup attempts. Try again in ${remainingTime} minutes.`);
        logger.security('Rate limit exceeded for signup', { email: sanitizedEmail });
        return;
      }
      
      authRateLimiter.recordAttempt(rateLimitKey);
      
      const redirectTo = searchParams.get('redirectTo') || '/';
      logger.debug('Auth: Signing up with redirectTo:', redirectTo);
      const redirectUrl = `${window.location.origin}${redirectTo}`;
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (authError) {
        logger.security('Signup failed', { error: authError.message, email: sanitizedEmail });
        if (authError.message.includes("already registered")) {
          toast.error("This email is already registered. Please sign in instead.");
        } else {
          toast.error(authError.message);
        }
        return;
      }

      // If user was created and we have an organization, create membership and profile
      if (authData.user && organization) {
        // First create user membership (required for RLS policies)
        const { error: membershipError } = await supabase
          .from('user_organization_memberships')
          .insert({
            user_id: authData.user.id,
            organization_id: organization.id,
            role: 'member' // Regular signup gets member role
          });

        if (membershipError) {
          logger.error('Membership creation failed:', membershipError);
          toast.error("Account created but failed to set up membership. Please contact support.");
          return;
        }

        // Then create user profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: authData.user.id,
            organization_id: organization.id,
            email: sanitizedEmail,
            role: 'member' // Regular signup gets member role
          });

        if (profileError) {
          logger.error('Profile creation failed:', profileError);
          toast.error("Account created but failed to set up profile. Please contact support.");
          return;
        }
      }

      logger.security('Signup successful', { email: sanitizedEmail });
      toast.success("Check your email for the confirmation link!");
    } catch (error) {
      logger.error('Signup unexpected error:', error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Input validation and sanitization
      const sanitizedEmail = sanitizeEmail(email);
      
      const emailValidation = emailSchema.safeParse(sanitizedEmail);
      if (!emailValidation.success) {
        toast.error(emailValidation.error.errors[0].message);
        return;
      }
      
      if (!password || password.length < 1) {
        toast.error("Password is required");
        return;
      }
      
      // Rate limiting check
      const rateLimitKey = `signin-${sanitizedEmail}`;
      if (!authRateLimiter.canAttempt(rateLimitKey)) {
        const remainingTime = authRateLimiter.getRemainingTime(rateLimitKey);
        toast.error(`Too many sign-in attempts. Try again in ${remainingTime} minutes.`);
        logger.security('Rate limit exceeded for signin', { email: sanitizedEmail });
        return;
      }
      
      authRateLimiter.recordAttempt(rateLimitKey);
      
      const { error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password,
      });

      if (error) {
        logger.security('Signin failed', { error: error.message, email: sanitizedEmail });
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password. Please check your credentials.");
        } else {
          toast.error(error.message);
        }
      } else {
        logger.security('Signin successful', { email: sanitizedEmail });
        // Reset rate limiting on successful login
        authRateLimiter.reset(rateLimitKey);
        
        // If we're in an org-specific auth page, check if user has access to this organization
        if (orgSlug && organization) {
          console.log('🔐 Checking organization access:', {
            orgSlug,
            organizationName: organization.name,
            organizationId: organization.id,
            userEmail: sanitizedEmail
          });
          
          // Check if user has membership in this organization
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            console.log('👤 User found:', { userId: user.id, email: user.email });
            
            const { data: membership, error: membershipError } = await supabase
              .from('user_organization_memberships')
              .select('role')
              .eq('user_id', user.id)
              .eq('organization_id', organization.id)
              .maybeSingle();
            
            console.log('🏢 Membership check result:', { 
              membership, 
              membershipError,
              hasAccess: !!membership 
            });
            
            if (!membership) {
              // SECURITY FIX: User doesn't have access to this organization
              console.log('❌ SECURITY: ACCESS DENIED - User not member of organization');
              logger.security('SECURITY: Sign in denied - user not member of organization', {
                userId: user.id,
                organizationId: organization.id,
                userEmail: user.email,
                orgSlug
              });
              
              // Log unauthorized access attempt
              await supabase.from('unauthorized_access_attempts').insert({
                user_id: user.id,
                attempted_slug: orgSlug,
                user_email: user.email,
                ip_address: null,
                user_agent: navigator.userAgent
              });
              
              // Sign them out since they don't have access
              await supabase.auth.signOut();
              
              // SECURITY FIX: Redirect to access denied page instead of fallback org
              const currentPath = window.location.pathname;
              navigate(`/access-denied?slug=${orgSlug}&redirectTo=${encodeURIComponent(currentPath)}`);
              return;
            } else {
              console.log('✅ ACCESS GRANTED - User is member of organization');
            }
          }
        }
        
        // Construct redirect path based on orgSlug
        let redirectTo;
        if (orgSlug) {
          // If we're in an org-specific auth page, redirect to the org dashboard
          redirectTo = searchParams.get('redirectTo') || `/${orgSlug}`;
        } else {
          // If it's the main auth page, redirect to the default URL or user's first org dashboard
          redirectTo = searchParams.get('redirectTo') || '/';
        }
        
        logger.debug('Auth: Sign in successful, redirecting to:', redirectTo);
        navigate(redirectTo);
      }
    } catch (error) {
      logger.error('Signin unexpected error:', error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Input validation and sanitization
      const sanitizedEmail = sanitizeEmail(resetEmail);
      
      const emailValidation = emailSchema.safeParse(sanitizedEmail);
      if (!emailValidation.success) {
        toast.error(emailValidation.error.errors[0].message);
        return;
      }
      
      // Rate limiting check
      const rateLimitKey = `reset-${sanitizedEmail}`;
      if (!passwordResetRateLimiter.canAttempt(rateLimitKey)) {
        const remainingTime = passwordResetRateLimiter.getRemainingTime(rateLimitKey);
        toast.error(`Too many password reset attempts. Try again in ${remainingTime} minutes.`);
        logger.security('Rate limit exceeded for password reset', { email: sanitizedEmail });
        return;
      }
      
      passwordResetRateLimiter.recordAttempt(rateLimitKey);

      const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
        redirectTo: `${window.location.origin}${window.location.pathname}?reset=true`,
      });

      if (error) {
        logger.security('Password reset failed', { error: error.message, email: sanitizedEmail });
        toast.error(error.message);
      } else {
        logger.security('Password reset requested', { email: sanitizedEmail });
        toast.success("Password reset email sent! Check your inbox.");
        setShowForgotPassword(false);
        setResetEmail("");
      }
    } catch (error) {
      logger.error('Password reset unexpected error:', error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      setLoading(false);
      return;
    }

    // Enhanced password validation
    const passwordValidation = passwordSchema.safeParse(newPassword);
    if (!passwordValidation.success) {
      toast.error(passwordValidation.error.errors[0].message);
      setLoading(false);
      return;
    }

    try {
      // Check if we have a valid session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        logger.security('Password update failed - no valid session', { error: sessionError?.message });
        toast.error("Session expired. Please request a new password reset link.");
        setShowUpdatePassword(false);
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        logger.security('Password update failed', { error: error.message });
        if (error.message.includes("Auth session missing")) {
          toast.error("Session expired. Please request a new password reset link.");
          setShowUpdatePassword(false);
        } else {
          toast.error(error.message);
        }
      } else {
        logger.security('Password updated successfully');
        toast.success("Password updated successfully!");
        setShowUpdatePassword(false);
        setNewPassword("");
        setConfirmPassword("");
        // Redirect to the organization dashboard after password update
        if (orgSlug) {
          navigate(`/${orgSlug}`);
        } else {
          navigate('/');
        }
      }
    } catch (error) {
      logger.error('Password update unexpected error:', error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Show loading while fetching organization data
  if (orgSlug && orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-muted-foreground">Loading organization...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background relative overflow-hidden">
      {/* Theme toggle - only show when not in org context */}
      {!orgSlug && (
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>
      )}
      
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row items-center justify-center min-h-screen gap-12">
          {/* Left side - Welcome content (only show on /auth route) */}
          {!orgSlug && (
            <div className="flex-1 max-w-lg text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-6">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Building className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Easy Room
                </h1>
              </div>
              
              <h2 className="text-3xl lg:text-4xl font-bold mb-4 leading-tight">
                Smart Room Booking for Modern Teams
              </h2>
              
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Transform how your team books meeting rooms with our intuitive platform. 
                Get started in minutes and say goodbye to booking conflicts forever.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                  <div className="p-2 bg-primary/10 rounded-lg mb-3">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">Easy Booking</h3>
                  <p className="text-sm text-muted-foreground">Book rooms in seconds with our intuitive interface</p>
                </div>
                
                <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                  <div className="p-2 bg-primary/10 rounded-lg mb-3">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">Team Management</h3>
                  <p className="text-sm text-muted-foreground">Invite team members and manage permissions</p>
                </div>
                
                <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                  <div className="p-2 bg-primary/10 rounded-lg mb-3">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">Smart Features</h3>
                  <p className="text-sm text-muted-foreground">Real-time availability and conflict prevention</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Right side - Auth forms */}
          <div className="flex-1 w-full max-w-md">
            <Card className="w-full border-0 shadow-2xl bg-card/80 backdrop-blur-sm">
              <CardHeader className="text-center space-y-4 pb-6">
                {organization && (
                  <div className="flex flex-col items-center space-y-3">
                    <Avatar className="h-16 w-16 ring-4 ring-primary/20">
                      <AvatarImage src={organization.logo_url} alt={organization.name} />
                      <AvatarFallback className="text-lg bg-primary/10 text-primary">
                        {organization.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-2xl font-bold">{organization.name}</CardTitle>
                      <p className="text-muted-foreground text-sm mt-1">Room Booking System</p>
                    </div>
                  </div>
                )}
                {!organization && !orgSlug && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <Building className="h-6 w-6 text-primary" />
                      <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
                    </div>
                    <p className="text-muted-foreground">Find your organization to continue</p>
                  </div>
                )}
                {!organization && orgSlug && !showUpdatePassword && (
                  <div>
                    <CardTitle className="text-2xl font-bold">Join Easy Room</CardTitle>
                    <p className="text-muted-foreground text-sm mt-1">Create your account to get started</p>
                  </div>
                )}
                {showUpdatePassword && (
                  <div>
                    <CardTitle className="text-2xl font-bold">Update Your Password</CardTitle>
                    <p className="text-muted-foreground text-sm mt-1">Enter your new password below</p>
                  </div>
                )}
              </CardHeader>
              
              <CardContent className="space-y-6">
                {showUpdatePassword ? (
                  // Password update form
                  <form onSubmit={handlePasswordUpdate} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="Enter your new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <PasswordStrength password={newPassword} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirm your new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating password...
                        </>
                      ) : (
                        "Update Password"
                      )}
                    </Button>
                  </form>
                ) : !orgSlug ? (
                  // Organization finder with integrated signup
                  <Tabs defaultValue="find" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="find">Find Organization</TabsTrigger>
                      <TabsTrigger value="create">Create New</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="find" className="space-y-4 mt-6">
                      <form onSubmit={handleOrganizationRedirect} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="org-subdomain">Your Organization</Label>
                          <div className="relative">
                            <Input
                              id="org-subdomain"
                              type="text"
                              placeholder="acme-corp"
                              value={orgSubdomain}
                              onChange={(e) => setOrgSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                              required
                              className="pr-32"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                              .easyroom.asia
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Enter your organization's subdomain to sign in
                          </p>
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Finding organization...
                            </>
                          ) : (
                            <>
                              Continue to Sign In
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                          )}
                        </Button>
                      </form>
                    </TabsContent>
                    
                    <TabsContent value="create" className="space-y-4 mt-6">
                      <div className="text-center py-4">
                        <div className="p-3 bg-primary/10 rounded-full w-fit mx-auto mb-4">
                          <Sparkles className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">Start Your Free Organization</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                          Set up your team's room booking system in under 2 minutes
                        </p>
                      </div>
                      
                      {/* Step 1: Admin Account Setup */}
                      {orgCreationStep === 1 && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-medium">Step 1: Admin Account</h3>
                            <span className="text-xs text-muted-foreground">Step 1 of 3</span>
                          </div>
                          
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="admin-email">Your Email</Label>
                              <Input
                                id="admin-email"
                                type="email"
                                placeholder="you@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="admin-password">Password</Label>
                              <Input
                                id="admin-password"
                                type="password"
                                placeholder="Create a secure password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                              />
                              <PasswordStrength password={password} />
                            </div>
                            
                            <Button 
                              className="w-full" 
                              onClick={async (e) => {
                                e.preventDefault();
                                setLoading(true);
                                
                                try {
                                  // Input validation
                                  const sanitizedEmail = sanitizeEmail(email);
                                  const emailValidation = emailSchema.safeParse(sanitizedEmail);
                                  const passwordValidation = passwordSchema.safeParse(password);
                                  
                                  if (!emailValidation.success) {
                                    toast.error(emailValidation.error.errors[0].message);
                                    return;
                                  }
                                  
                                  if (!passwordValidation.success) {
                                    toast.error(passwordValidation.error.errors[0].message);
                                    return;
                                  }
                                  
                                   // Validate credentials before proceeding
                                   console.log('Step 1: Validating credentials for:', sanitizedEmail);
                                   
                                   // Check if user is already signed in
                                   const { data: { user } } = await supabase.auth.getUser();
                                   if (user) {
                                     // User is already authenticated, verify email matches
                                     if (user.email !== sanitizedEmail) {
                                       toast.error("Email mismatch. Please sign out and try again with the correct email.");
                                       return;
                                     }
                                     // Email matches, proceed to step 2
                                     setOrgCreationStep(2);
                                     return;
                                   }
                                   
                                   // User not signed in - attempt to validate credentials by trying to sign in
                                   const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                                     email: sanitizedEmail,
                                     password: password,
                                   });
                                   
                                   if (authError) {
                                     if (authError.message.includes("Invalid login credentials") || 
                                         authError.message.includes("Email not confirmed")) {
                                       toast.error("Invalid email or password. Please check your credentials.");
                                     } else {
                                       toast.error(authError.message);
                                     }
                                     logger.security('Step 1 credential validation failed', { 
                                       error: authError.message, 
                                       email: sanitizedEmail 
                                     });
                                     return;
                                   }
                                   
                                   if (authData.user) {
                                     // Credentials are valid, proceed to step 2
                                     toast.success("Credentials validated! Please continue with organization setup.");
                                     setOrgCreationStep(2);
                                   } else {
                                     toast.error("Authentication failed. Please try again.");
                                   }
                                } catch (error) {
                                  logger.error('Admin account setup error:', error);
                                  toast.error("An error occurred while setting up your account.");
                                } finally {
                                  setLoading(false);
                                }
                              }}
                              disabled={loading}
                            >
                              {loading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Checking account...
                                </>
                              ) : (
                                "Continue to Organization Type"
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* Step 2: Organization Type */}
                      {orgCreationStep === 2 && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-medium">Step 2: Organization Type</h3>
                            <span className="text-xs text-muted-foreground">Step 2 of 3</span>
                          </div>
                          
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                              {['School', 'Startup', 'Corporate', 'Personal', 'Non-profit'].map(type => (
                                <Button
                                  key={type}
                                  type="button"
                                  variant={orgType === type.toLowerCase() ? "default" : "outline"}
                                  className="h-auto py-3"
                                  onClick={() => setOrgType(type.toLowerCase())}
                                >
                                  {type}
                                </Button>
                              ))}
                            </div>
                            
                            <div className="space-y-2 mt-4">
                              <Label>Where did you hear about us?</Label>
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                {[
                                  'YouTube', 'LinkedIn', 'Events/conferences', 'Podcast', 
                                  'News publications', 'Friend', 'Search engines', 'Email',
                                  'AI Chatbots', 'Facebook/Instagram', 'TV/Streaming', 'Consultant',
                                  'Outdoors ad'
                                ].map(source => (
                                  <Button
                                    key={source}
                                    type="button"
                                    variant={referralSource === source.toLowerCase() ? "default" : "outline"}
                                    className="h-auto py-2 text-sm"
                                    onClick={() => setReferralSource(source.toLowerCase())}
                                  >
                                    {source}
                                  </Button>
                                ))}
                              </div>
                            </div>
                            
                            <div className="flex gap-2 mt-4">
                              <Button 
                                variant="outline" 
                                className="flex-1"
                                onClick={() => setOrgCreationStep(1)}
                              >
                                Back
                              </Button>
                              <Button 
                                className="flex-1"
                                onClick={() => setOrgCreationStep(3)}
                                disabled={!orgType}
                              >
                                Continue to Organization Details
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Step 3: Organization Details & Creation */}
                      {orgCreationStep === 3 && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-medium">Step 3: Organization Details</h3>
                            <span className="text-xs text-muted-foreground">Step 3 of 3</span>
                          </div>
                          
                          <form onSubmit={handleOrganizationSignUp} className="space-y-4">
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="org-name">Organization Name</Label>
                                <Input
                                  id="org-name"
                                  type="text"
                                  placeholder="Acme Corporation"
                                  value={organizationName}
                                  onChange={(e) => setOrganizationName(e.target.value)}
                                  required
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="org-slug">Your URL</Label>
                                <div className="relative">
                                  <Input
                                    id="org-slug"
                                    type="text"
                                    placeholder="acme-corp"
                                    value={organizationSlug}
                                    onChange={(e) => setOrganizationSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                    required
                                    className="pr-32"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                    .easyroom.asia
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex gap-2 mt-4">
                              <Button 
                                type="button"
                                variant="outline" 
                                className="flex-1"
                                onClick={() => setOrgCreationStep(2)}
                              >
                                Back
                              </Button>
                              <Button 
                                type="submit"
                                className="flex-1"
                                disabled={loading || !organizationName || !organizationSlug}
                              >
                                {loading ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating organization...
                                  </>
                                ) : (
                                  <>
                                    Create Organization
                                    <Sparkles className="ml-2 h-4 w-4" />
                                  </>
                                )}
                              </Button>
                            </div>
                          </form>
                        </div>
                      )}
                      
                      <p className="text-xs text-muted-foreground text-center mt-6">
                        By creating an account, you agree to our Terms of Service and Privacy Policy
                      </p>
                    </TabsContent>
                  </Tabs>
                ) : (
                  // Existing organization-specific auth - LOGIN ONLY
                  <div className="w-full">
                    {/* Organization Sign In Form */}
                    <div className="space-y-6">{/* Add space for sign in form */}
                      {!showForgotPassword ? (
                        <>
                          <form onSubmit={handleSignIn} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="signin-email">Email</Label>
                              <Input
                                id="signin-email"
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label htmlFor="signin-password">Password</Label>
                                <Button
                                  type="button"
                                  variant="link"
                                  className="text-xs h-auto p-0 text-primary"
                                  onClick={() => {
                                    setShowForgotPassword(true);
                                    setResetEmail(email);
                                  }}
                                >
                                  Forgot Password?
                                </Button>
                              </div>
                              <Input
                                id="signin-password"
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                              />
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                              {loading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Signing in...
                                </>
                              ) : (
                                "Sign In"
                              )}
                            </Button>
                          </form>
                          
                          {/* Need access message */}
                          <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border/50">
                            <div className="flex items-start gap-3">
                              <Shield className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <div className="text-sm">
                                <p className="text-muted-foreground">
                                  <strong>Need access?</strong> Ask an admin for an invite link.
                                </p>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-4">
                          <div className="text-center mb-4">
                            <h3 className="font-semibold mb-2">Reset Your Password</h3>
                            <p className="text-sm text-muted-foreground">
                              Enter your email address and we'll send you a link to reset your password.
                            </p>
                          </div>
                          <form onSubmit={handlePasswordReset} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="reset-email">Email</Label>
                              <Input
                                id="reset-email"
                                type="email"
                                placeholder="Enter your email"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                required
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                  setShowForgotPassword(false);
                                  setResetEmail("");
                                }}
                                disabled={loading}
                              >
                                Back to Sign In
                              </Button>
                              <Button type="submit" className="flex-1" disabled={loading}>
                                {loading ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending...
                                  </>
                                ) : (
                                  "Send Reset Link"
                                )}
                              </Button>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                Built with <Heart className="h-3 w-3 text-red-500 fill-current" /> in Cambodia
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Powered by Easyroom
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
