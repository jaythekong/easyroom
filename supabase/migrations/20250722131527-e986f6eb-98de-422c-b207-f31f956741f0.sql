-- Add welcome_message field to organizations table
ALTER TABLE public.organizations 
ADD COLUMN welcome_message TEXT DEFAULT 'Welcome! You have successfully subscribed to booking notifications. You will receive updates when bookings are made, modified, or cancelled.';