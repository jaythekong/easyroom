import React from 'react';
import { cn } from '@/lib/utils';
import QRCode from 'qrcode';
import { useState, useEffect } from 'react';

interface DemoWelcomeSettings {
  welcome_text: string;
  sub_text: string;
  background_type: string;
  background_value: string;
  text_color: string;
  wifi_enabled: boolean;
  wifi_ssid?: string;
  animation_enabled: boolean;
  animation_type: string;
}

interface DemoWelcomeScreenProps {
  settings: DemoWelcomeSettings;
}

export function DemoWelcomeScreen({ settings }: DemoWelcomeScreenProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    if (settings.wifi_enabled && settings.wifi_ssid) {
      // Generate WiFi QR code for demo
      const wifiString = `WIFI:T:WPA;S:${settings.wifi_ssid};P:demo123;H:false;;`;
      QRCode.toDataURL(wifiString, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }).then(setQrCodeUrl).catch(console.error);
    }
  }, [settings.wifi_enabled, settings.wifi_ssid]);

  const getAnimationClass = () => {
    if (!settings.animation_enabled) return '';
    
    switch (settings.animation_type) {
      case 'floating':
        return 'animate-[float_3s_ease-in-out_infinite]';
      case 'pulse':
        return 'animate-pulse';
      case 'bounce':
        return 'animate-bounce';
      default:
        return '';
    }
  };

  const backgroundStyle = settings.background_type === 'gradient' 
    ? { background: settings.background_value }
    : { backgroundColor: settings.background_value };

  return (
    <div 
      className="h-full w-full flex flex-col items-center justify-center relative overflow-hidden"
      style={backgroundStyle}
    >
      {/* Main Content */}
      <div className={cn(
        "text-center space-y-6 px-8",
        getAnimationClass()
      )}>
        {/* Welcome Text */}
        <h1 
          className="text-6xl md:text-8xl font-bold drop-shadow-lg"
          style={{ color: settings.text_color }}
        >
          {settings.welcome_text}
        </h1>
        
        {/* Sub Text */}
        {settings.sub_text && (
          <p 
            className="text-2xl md:text-3xl opacity-90"
            style={{ color: settings.text_color }}
          >
            {settings.sub_text}
          </p>
        )}

        {/* Demo Badge */}
        <div className="bg-white/20 backdrop-blur-sm border border-white/30 px-4 py-2 rounded-full inline-block">
          <span className="text-white font-medium">✨ Demo Welcome Screen</span>
        </div>
      </div>

      {/* WiFi QR Code */}
      {settings.wifi_enabled && qrCodeUrl && (
        <div className="absolute bottom-8 left-8 bg-white p-4 rounded-lg shadow-lg">
          <div className="text-center space-y-2">
            <img src={qrCodeUrl} alt="WiFi QR Code" className="w-32 h-32" />
            <div className="text-sm font-medium text-gray-800">
              Connect to WiFi
            </div>
            <div className="text-xs text-gray-600">
              {settings.wifi_ssid}
            </div>
          </div>
        </div>
      )}

      {/* Demo Logo Placeholder */}
      <div className="absolute bottom-8 right-8 bg-white/20 backdrop-blur-sm border border-white/30 p-4 rounded-lg">
        <div className="w-16 h-16 bg-white/30 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xl">LOGO</span>
        </div>
      </div>

      {/* Ticker Messages Preview */}
      <div className="absolute top-0 left-0 right-0 bg-black/20 backdrop-blur-sm border-b border-white/20">
        <div className="overflow-hidden h-12 flex items-center">
          <div className="animate-scroll whitespace-nowrap text-white px-4">
            📢 Welcome to EasyRoom Demo • 🎉 Book meeting rooms instantly • ⚡ Experience the future of workspace management • 
          </div>
        </div>
      </div>
    </div>
  );
}