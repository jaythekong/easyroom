import { useEffect } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";

// Helper function to convert hex to HSL
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l;

  l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0;
    }

    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Helper function to generate lighter/darker variants
function adjustHslLightness(hsl: string, adjustment: number): string {
  const [h, s, lStr] = hsl.split(' ');
  const l = parseInt(lStr.replace('%', ''));
  const newL = Math.max(0, Math.min(100, l + adjustment));
  return `${h} ${s} ${newL}%`;
}

export function useOrganizationTheme() {
  const { organization } = useOrganization();

  useEffect(() => {
    if (!organization?.primary_color) return;

    const primaryColor = organization.primary_color;
    
    try {
      // Convert hex to HSL
      const hsl = hexToHsl(primaryColor);
      
      // Generate color variants
      const primaryForeground = adjustHslLightness(hsl, -45); // Darker for text
      const primaryGlow = adjustHslLightness(hsl, 15); // Lighter for glow effects
      const accent = adjustHslLightness(hsl, 10); // Slightly lighter accent
      const accentForeground = adjustHslLightness(hsl, -40); // Darker for accent text

      // Apply CSS variables
      const root = document.documentElement;
      root.style.setProperty('--primary', hsl);
      root.style.setProperty('--primary-foreground', primaryForeground);
      root.style.setProperty('--primary-glow', primaryGlow);
      root.style.setProperty('--accent', accent);
      root.style.setProperty('--accent-foreground', accentForeground);

      // Update gradients
      root.style.setProperty('--gradient-primary', `linear-gradient(135deg, hsl(${hsl}), hsl(${primaryGlow}))`);
      
      // Update shadows with the primary color
      root.style.setProperty('--shadow-elegant', `0 10px 30px -10px hsl(${hsl} / 0.3)`);
      root.style.setProperty('--shadow-glow', `0 0 40px hsl(${primaryGlow} / 0.4)`);

    } catch (error) {
      console.error('Error applying organization theme:', error);
    }
  }, [organization?.primary_color]);

  return { organization };
}