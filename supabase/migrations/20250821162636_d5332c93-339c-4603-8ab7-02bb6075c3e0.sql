-- Add WiFi QR code fields to welcome_screen_settings table
ALTER TABLE public.welcome_screen_settings 
ADD COLUMN IF NOT EXISTS wifi_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS wifi_ssid TEXT,
ADD COLUMN IF NOT EXISTS wifi_password TEXT,
ADD COLUMN IF NOT EXISTS wifi_security TEXT DEFAULT 'WPA' CHECK (wifi_security IN ('WPA', 'WEP', 'nopass')),
ADD COLUMN IF NOT EXISTS wifi_hidden BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS qr_position TEXT DEFAULT 'bottom-left' CHECK (qr_position IN ('bottom-right', 'bottom-left', 'top-right', 'top-left', 'center-top', 'center-bottom')),
ADD COLUMN IF NOT EXISTS qr_size TEXT DEFAULT 'medium' CHECK (qr_size IN ('small', 'medium', 'large'));