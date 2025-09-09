export const isPWAInstalled = (): boolean => {
  // Check if running in standalone mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  // Check for iOS standalone
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isInStandaloneMode = (window.navigator as any).standalone;
  
  return isStandalone || (isIOS && isInStandaloneMode);
};

export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const getBrowserType = (): string => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('chrome') && !userAgent.includes('edg')) return 'chrome';
  if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'safari';
  if (userAgent.includes('firefox')) return 'firefox';
  if (userAgent.includes('edg')) return 'edge';
  
  return 'unknown';
};

export const getInstallInstructions = (isMobile: boolean): string => {
  const browser = getBrowserType();
  
  switch (browser) {
    case 'chrome':
      return isMobile 
        ? "Tap the menu (⋮) and select 'Add to Home screen'"
        : "Click the install icon in the address bar";
    case 'safari':
      return "Tap the Share button and select 'Add to Home Screen'";
    case 'firefox':
      return isMobile
        ? "Tap the menu (⋮) and select 'Install'"
        : "Click the install icon in the address bar";
    case 'edge':
      return isMobile
        ? "Tap the menu (⋯) and select 'Add to phone'"
        : "Click the install icon in the address bar";
    default:
      return "Look for an install option in your browser menu";
  }
};

export const addToHomeScreenPrompt = (): void => {
  const browser = getBrowserType();
  const isMobile = isMobileDevice();
  
  const instructions = getInstallInstructions(isMobile);
  
  if (confirm(`Install Easy Room for the best experience.\n\n${instructions}\n\nWould you like to see the instructions again?`)) {
    // Could show a more detailed modal here
    alert(instructions);
  }
};