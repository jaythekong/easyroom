import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useWelcomeScreenSettings } from "@/hooks/useWelcomeScreen";
import { useOrganizationTheme } from "@/hooks/useOrganizationTheme";
import { useOrganizationBySlug } from "@/hooks/useOrganization";
import { Loader2 } from "lucide-react";

export function WelcomeScreen() {
  const { orgSlug } = useParams();
  const { data: organization } = useOrganizationBySlug(orgSlug);
  const { data: settings, isLoading } = useWelcomeScreenSettings(organization?.id);
  const { organization: orgContext } = useOrganizationTheme();
  const [isVisible, setIsVisible] = useState(false);

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
  const animationSpeed = settings?.animation_speed || "normal";
  const backgroundType = settings?.background_type || "gradient";
  const backgroundValue = settings?.background_value || "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)))";

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

  // Animation classes with speed control
  const getAnimationClass = () => {
    if (!animationEnabled) return '';
    
    switch (animationType) {
      case 'floating':
        return animationSpeed === 'slow' ? 'animate-[float_12s_ease-in-out_infinite]' : 
               animationSpeed === 'fast' ? 'animate-[float_3s_ease-in-out_infinite]' : 
               'animate-[float_6s_ease-in-out_infinite]';
      case 'pulse':
        return animationSpeed === 'slow' ? 'animate-[pulse_4s_cubic-bezier(0.4,0,0.6,1)_infinite]' : 
               animationSpeed === 'fast' ? 'animate-[pulse_1s_cubic-bezier(0.4,0,0.6,1)_infinite]' : 
               'animate-pulse';
      case 'fade':
        return animationSpeed === 'slow' ? 'animate-[fade_8s_ease-in-out_infinite]' : 
               animationSpeed === 'fast' ? 'animate-[fade_2s_ease-in-out_infinite]' : 
               'animate-[fade_4s_ease-in-out_infinite]';
      case 'slide':
        return animationSpeed === 'slow' ? 'animate-[slide_16s_ease-in-out_infinite]' : 
               animationSpeed === 'fast' ? 'animate-[slide_4s_ease-in-out_infinite]' : 
               'animate-[slide_8s_ease-in-out_infinite]';
      default:
        return 'animate-[float_6s_ease-in-out_infinite]';
    }
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
    <div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={getBackgroundStyle()}
    >
      {/* Animated overlay */}
      {animationEnabled && (
        <div className="absolute inset-0 opacity-20">
          <div className={animationSpeed === 'slow' ? 'absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-[drift_40s_ease-in-out_infinite]' : 
                          animationSpeed === 'fast' ? 'absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-[drift_10s_ease-in-out_infinite]' : 
                          'absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-[drift_20s_ease-in-out_infinite]'} 
               style={{ animationDelay: '0s' }} />
          <div className={animationSpeed === 'slow' ? 'absolute top-1/2 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-[drift_50s_ease-in-out_infinite_reverse]' : 
                          animationSpeed === 'fast' ? 'absolute top-1/2 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-[drift_12s_ease-in-out_infinite_reverse]' : 
                          'absolute top-1/2 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-[drift_25s_ease-in-out_infinite_reverse]'} 
               style={{ animationDelay: '5s' }} />
          <div className={animationSpeed === 'slow' ? 'absolute bottom-0 left-1/3 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-[drift_36s_ease-in-out_infinite]' : 
                          animationSpeed === 'fast' ? 'absolute bottom-0 left-1/3 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-[drift_9s_ease-in-out_infinite]' : 
                          'absolute bottom-0 left-1/3 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-[drift_18s_ease-in-out_infinite]'} 
               style={{ animationDelay: '10s' }} />
        </div>
      )}

      {/* Welcome text */}
      <div className={`
        text-center z-10 px-8 transition-all duration-1000 transform
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
        ${getAnimationClass()}
      `}>
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

      {/* Organization branding */}
      {organization?.logo_url && (
        <div className={`${getLogoPositionClass()} opacity-60`}>
          <img 
            src={organization.logo_url} 
            alt={organization.name}
            className="h-16 w-16 object-contain filter drop-shadow-lg"
          />
        </div>
      )}
    </div>
  );
}

// Add custom keyframes to index.css if not already present
declare global {
  interface CSSStyleDeclaration {
    '--animation-delay'?: string;
  }
}