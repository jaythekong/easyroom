import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useWelcomeScreenSettings } from "@/hooks/useWelcomeScreen";
import { useOrganizationTheme } from "@/hooks/useOrganizationTheme";
import { useOrganizationBySlug } from "@/hooks/useOrganization";
import { generateWiFiQRCode, getQRPositionClasses } from "@/lib/qrUtils";
import { Loader2 } from "lucide-react";

export function WelcomeScreen() {
  const { orgSlug } = useParams();
  const { data: organization } = useOrganizationBySlug(orgSlug);
  const { data: settings, isLoading } = useWelcomeScreenSettings(organization?.id);
  const { organization: orgContext } = useOrganizationTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }

  // Default settings if none configured
  const welcomeText = settings?.welcome_text || "Welcome!";
  const subText = settings?.sub_text || "";
  const textColor = settings?.text_color || "#FFFFFF";
  const subTextColor = settings?.sub_text_color || "#FFFFFF";
  const fontSize = settings?.font_size || "text-6xl";
  const subTextSize = settings?.sub_text_size || "text-2xl";
  const fontFamily = settings?.font_family || "font-sans";
  const subFontFamily = settings?.sub_font_family || "font-sans";
  const textShadow = settings?.text_shadow ?? true;
  const textOutline = settings?.text_outline ?? false;
  const logoPosition = settings?.logo_position || "bottom-right";
  const animationEnabled = settings?.animation_enabled ?? true;
  const animationType = settings?.animation_type || "floating";
  const animationSpeed = settings?.animation_speed || 3;
  const backgroundType = settings?.background_type || "gradient";
  const backgroundValue = settings?.background_value || "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))";
  
  // WiFi QR Code settings
  const wifiEnabled = settings?.wifi_enabled ?? false;
  const wifiSsid = settings?.wifi_ssid || "";
  const wifiPassword = settings?.wifi_password || "";
  const wifiSecurity = settings?.wifi_security || 'WPA';
  const wifiHidden = settings?.wifi_hidden ?? false;
  const qrPosition = settings?.qr_position || 'bottom-left';
  const qrSize = settings?.qr_size || 'medium';

  // Generate WiFi QR code when settings change
  useEffect(() => {
    if (wifiEnabled && wifiSsid) {
      generateWiFiQRCode({
        ssid: wifiSsid,
        password: wifiPassword,
        security: wifiSecurity,
        hidden: wifiHidden
      }, qrSize)
        .then(setQrCodeDataUrl)
        .catch((error) => {
          console.error('Failed to generate WiFi QR code:', error);
          setQrCodeDataUrl(null);
        });
    } else {
      setQrCodeDataUrl(null);
    }
  }, [wifiEnabled, wifiSsid, wifiPassword, wifiSecurity, wifiHidden, qrSize]);

  // Generate background style
  const getBackgroundStyle = () => {
    switch (backgroundType) {
      case 'gradient':
        return { background: backgroundValue };
      case 'color':
        return { backgroundColor: backgroundValue };
      case 'image':
        return { 
          backgroundImage: `url(${backgroundValue})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        };
      default:
        return { background: 'var(--gradient-primary)' };
    }
  };

  // Animation system - using inline styles for guaranteed functionality
  const getAnimationStyle = () => {
    if (!animationEnabled || animationSpeed === 0) return {};
    
    // Calculate duration based on speed (0-5 scale)
    const baseDuration = 6; // seconds for normal speed (3)
    const speedMultiplier = animationSpeed === 1 ? 4 : 
                           animationSpeed === 2 ? 2 : 
                           animationSpeed === 4 ? 0.5 : 
                           animationSpeed === 5 ? 0.25 : 1;
    const duration = baseDuration * speedMultiplier;
    
    switch (animationType) {
      case 'floating':
        return {
          animation: `floatAnimation ${duration}s ease-in-out infinite`
        };
      case 'pulse':
        return {
          animation: `pulseAnimation ${duration}s ease-in-out infinite`
        };
      case 'fade':
        return {
          animation: `fadeAnimation ${duration}s ease-in-out infinite`
        };
      case 'slide':
        return {
          animation: `slideAnimation ${duration}s ease-in-out infinite`
        };
      default:
        return {
          animation: `floatAnimation ${duration}s ease-in-out infinite`
        };
    }
  };

  const getDriftAnimationStyle = (delay: string, reverse = false) => {
    if (!animationEnabled || animationSpeed === 0) return {};
    
    const baseDuration = 20; // seconds for drift
    const speedMultiplier = animationSpeed === 1 ? 4 : 
                           animationSpeed === 2 ? 2 : 
                           animationSpeed === 4 ? 0.5 : 
                           animationSpeed === 5 ? 0.25 : 1;
    const duration = baseDuration * speedMultiplier;
    
    return {
      animation: `driftAnimation ${duration}s ease-in-out infinite ${reverse ? 'reverse' : ''}`,
      animationDelay: delay
    };
  };

  // Text styling classes - enhanced shadow
  const getTextStyling = () => {
    let classes = '';
    if (textShadow) classes += ' [text-shadow:_0_4px_12px_rgba(0,0,0,0.8),_0_2px_6px_rgba(0,0,0,0.6)]';
    if (textOutline) classes += ' [text-shadow:_2px_2px_0_rgb(0_0_0_/_80%),_-2px_-2px_0_rgb(0_0_0_/_80%),_2px_-2px_0_rgb(0_0_0_/_80%),_-2px_2px_0_rgb(0_0_0_/_80%)]';
    return classes;
  };

  // Logo position classes
  const getLogoPositionClass = () => {
    switch (logoPosition) {
      case 'bottom-left':
        return 'absolute bottom-8 left-8';
      case 'top-right':
        return 'absolute top-8 right-8';
      case 'top-left':
        return 'absolute top-8 left-8';
      case 'center-bottom':
        return 'absolute bottom-8 left-1/2 transform -translate-x-1/2';
      case 'bottom-right':
      default:
        return 'absolute bottom-8 right-8';
    }
  };

  return (
    <>
      {/* Add keyframes to head */}
      <style>
        {`
          @keyframes floatAnimation {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          @keyframes pulseAnimation {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.02); }
          }
          @keyframes fadeAnimation {
            0%, 100% { opacity: 0.8; }
            50% { opacity: 1; }
          }
          @keyframes slideAnimation {
            0%, 100% { transform: translateX(0px); }
            50% { transform: translateX(10px); }
          }
          @keyframes driftAnimation {
            0%, 100% { transform: translate(0px, 0px) rotate(0deg); }
            33% { transform: translate(30px, -30px) rotate(120deg); }
            66% { transform: translate(-20px, 20px) rotate(240deg); }
          }
        `}
      </style>
      
      <div 
        className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={getBackgroundStyle()}
      >
        {/* Animated overlay */}
        {animationEnabled && animationSpeed > 0 && (
          <div className="absolute inset-0 opacity-20">
            <div 
              className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" 
              style={getDriftAnimationStyle('0s')}
            />
            <div 
              className="absolute top-1/2 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl" 
              style={getDriftAnimationStyle('5s', true)}
            />
            <div 
              className="absolute bottom-0 left-1/3 w-72 h-72 bg-white/10 rounded-full blur-3xl" 
              style={getDriftAnimationStyle('10s')}
            />
          </div>
        )}

        {/* Welcome text */}
        <div 
          className={`text-center z-10 px-8 transition-all duration-1000 transform ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={getAnimationStyle()}
        >
          <h1 
            className={`${fontSize} ${fontFamily} font-bold mb-6 ${getTextStyling()}`}
            style={{ color: textColor }}
          >
            {welcomeText}
          </h1>
          
          {subText && (
            <p 
              className={`${subTextSize} ${subFontFamily} opacity-90 max-w-2xl mx-auto leading-relaxed ${getTextStyling()}`}
              style={{ color: subTextColor }}
            >
              {subText}
            </p>
          )}
        </div>

        {/* WiFi QR Code */}
        {wifiEnabled && qrCodeDataUrl && (
          <div className={`${getQRPositionClasses(qrPosition)} z-20`}>
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-2xl border border-white/20">
              <div className="text-center">
                <img 
                  src={qrCodeDataUrl} 
                  alt="WiFi QR Code"
                  className="rounded-lg shadow-lg mx-auto"
                />
                <div className="mt-3 text-sm text-gray-700">
                  <p className="font-semibold">{wifiSsid}</p>
                  <p className="text-xs opacity-70">Scan to connect to WiFi</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Organization branding */}
        {organization?.logo_url && (
          <div className={`${getLogoPositionClass()} opacity-60 ${wifiEnabled && qrCodeDataUrl && logoPosition === qrPosition ? 'z-10' : 'z-20'}`}>
            <img 
              src={organization.logo_url} 
              alt={organization.name}
              className="h-16 w-16 object-contain filter drop-shadow-lg"
            />
          </div>
        )}
      </div>
    </>
  );
}

// Add custom keyframes to index.css if not already present
declare global {
  interface CSSStyleDeclaration {
    '--animation-delay'?: string;
  }
}