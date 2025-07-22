// Production-safe logging utility
const isDevelopment = import.meta.env.DEV;

export const logger = {
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },
  
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info('[INFO]', ...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args);
    }
    // In production, could send to error tracking service
  },
  
  error: (...args: any[]) => {
    if (isDevelopment) {
      console.error('[ERROR]', ...args);
    }
    // In production, could send to error tracking service like Sentry
    // Example: Sentry.captureException(args[0]);
  },
  
  // Security-specific logging for audit purposes
  security: (event: string, details?: any) => {
    const logData = {
      timestamp: new Date().toISOString(),
      event,
      details: details || {}
    };
    
    if (isDevelopment) {
      console.log('[SECURITY]', logData);
    }
    // In production, should send to security monitoring system
  }
};