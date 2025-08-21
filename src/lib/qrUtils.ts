import QRCode from 'qrcode';

export interface WiFiCredentials {
  ssid: string;
  password: string;
  security: 'WPA' | 'WEP' | 'nopass';
  hidden?: boolean;
}

/**
 * Generates a WiFi QR code string in the standard format
 * Format: WIFI:T:{security};S:{ssid};P:{password};H:{hidden};;
 */
export function generateWiFiQRString(credentials: WiFiCredentials): string {
  const { ssid, password, security, hidden = false } = credentials;
  
  // Escape special characters in SSID and password
  const escapedSsid = ssid.replace(/([\\;,":.])/g, '\\$1');
  const escapedPassword = password.replace(/([\\;,":.])/g, '\\$1');
  
  const securityType = security === 'nopass' ? 'nopass' : security;
  const hiddenFlag = hidden ? 'true' : 'false';
  
  return `WIFI:T:${securityType};S:${escapedSsid};P:${escapedPassword};H:${hiddenFlag};;`;
}

/**
 * Generates a QR code data URL for WiFi credentials
 */
export async function generateWiFiQRCode(
  credentials: WiFiCredentials,
  size: 'small' | 'medium' | 'large' = 'medium'
): Promise<string> {
  const qrString = generateWiFiQRString(credentials);
  
  const sizeMap = {
    small: 120,
    medium: 180,
    large: 240
  };
  
  try {
    const qrCodeDataURL = await QRCode.toDataURL(qrString, {
      width: sizeMap[size],
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
    
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating WiFi QR code:', error);
    throw new Error('Failed to generate WiFi QR code');
  }
}

/**
 * Gets the CSS classes for QR code positioning
 */
export function getQRPositionClasses(position: string): string {
  const positions = {
    'bottom-right': 'absolute bottom-8 right-8',
    'bottom-left': 'absolute bottom-8 left-8',
    'top-right': 'absolute top-8 right-8',
    'top-left': 'absolute top-8 left-8',
    'center-top': 'absolute top-8 left-1/2 transform -translate-x-1/2',
    'center-bottom': 'absolute bottom-8 left-1/2 transform -translate-x-1/2'
  };
  
  return positions[position as keyof typeof positions] || positions['bottom-left'];
}