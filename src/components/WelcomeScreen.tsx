import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useWelcomeScreenSettings } from "@/hooks/useWelcomeScreen";
import { useOrganizationTheme } from "@/hooks/useOrganizationTheme";
import { useOrganizationBySlug } from "@/hooks/useOrganization";
import { generateWiFiQRCode, getQRPositionClasses } from "@/lib/qrUtils";
import { Loader2 } from "lucide-react";

export function WelcomeScreen() {
  // All hooks must be called unconditionally at the top level
  const { orgSlug } = useParams();
  const { data: organization } = useOrganizationBySlug(orgSlug);
  const { data: settings, isLoading } = useWelcomeScreenSettings(organization?.id);
  const { organization: orgContext } = useOrganizationTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  // Effect to set visibility
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Default settings processing (always run, never conditional)
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

  // WiFi QR code generation effect
  useEffect(() => {
    if (wifiEnabled && wifiSsid) {
      const timeoutId = setTimeout(() => {
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
      }, 100);
      
      return () => clearTimeout(timeoutId);
    } else {
      setQrCodeDataUrl(null);
    }
  }, [wifiEnabled, wifiSsid, wifiPassword, wifiSecurity, wifiHidden, qrSize]);

  // Loading state check (after all hooks)
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }

  // Helper functions
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
        return { background: backgroundValue };
    }
  };

  const getAnimationStyle = () => {
    if (!animationEnabled || animationSpeed === 0) return {};
    
    const duration = 6 - animationSpeed; // Higher speed = lower duration
    const delay = Math.random() * 2; // Random delay between 0-2s
    
    return {
      animationDuration: `${duration}s`,
      animationDelay: `${delay}s`,
      animationIterationCount: 'infinite',
      animationTimingFunction: 'ease-in-out',
      animationName: animationType
    };
  };

  const getDriftAnimationStyle = (delay = '0s', reverse = false) => {
    if (!animationEnabled || animationSpeed === 0) return {};
    
    const duration = 8 - animationSpeed;
    const direction = reverse ? 'reverse' : 'normal';
    
    return {
      animationDuration: `${duration}s`,
      animationDelay: delay,
      animationIterationCount: 'infinite',
      animationTimingFunction: 'ease-in-out',
      animationDirection: direction,
      animationName: 'drift'
    };
  };

  const getTextStyling = () => {
    let classes = '';
    if (textShadow) classes += ' drop-shadow-lg';
    if (textOutline) classes += ' text-outline';
    return classes;
  };

  const getLogoPositionClass = () => {
    const positions = {
      'bottom-right': 'absolute bottom-8 right-8',
      'bottom-left': 'absolute bottom-8 left-8',
      'top-right': 'absolute top-8 right-8',
      'top-left': 'absolute top-8 left-8',
      'center-bottom': 'absolute bottom-8 left-1/2 transform -translate-x-1/2'
    };
    return positions[logoPosition as keyof typeof positions] || positions['bottom-right'];
  };

  return (
    <div className="relative">
      <style>
        {`
          @keyframes floating {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            33% { transform: translateY(-10px) rotate(1deg); }
            66% { transform: translateY(5px) rotate(-1deg); }
          }
          
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.9; }
          }
          
          @keyframes fade {
            0%, 100% { opacity: 0.8; }
            50% { opacity: 1; }
          }
          
          @keyframes slide {
            0%, 100% { transform: translateX(0px); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
          }
          
          @keyframes drift {
            0%, 100% { transform: translate(0px, 0px) scale(1); }
            25% { transform: translate(20px, -30px) scale(1.1); }
            50% { transform: translate(-15px, 20px) scale(0.9); }
            75% { transform: translate(30px, 10px) scale(1.05); }
          }
          
          .text-outline {
            text-shadow: 
              -1px -1px 0 rgba(0,0,0,0.5),
              1px -1px 0 rgba(0,0,0,0.5),
              -1px 1px 0 rgba(0,0,0,0.5),
              1px 1px 0 rgba(0,0,0,0.5);
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
              className={`${subTextSize} ${subFontFamily} ${getTextStyling()}`}
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
    </div>
  );
}