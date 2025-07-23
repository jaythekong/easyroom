
// Production-safe logging utility
const isDevelopment = import.meta.env.DEV;

// Sanitize sensitive data before logging
const sanitizeData = (data: any): any => {
  if (typeof data !== 'object' || data === null) return data;
  
  const sanitized = { ...data };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'email', 'phone'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

export const logger = {
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args.map(sanitizeData));
    }
  },
  
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info('[INFO]', ...args.map(sanitizeData));
    }
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args.map(sanitizeData));
    }
    // In production, could send to error tracking service
  },
  
  error: (...args: any[]) => {
    if (isDevelopment) {
      console.error('[ERROR]', ...args.map(sanitizeData));
    }
    // In production, could send to error tracking service like Sentry
    // Example: Sentry.captureException(args[0]);
  },
  
  // Security-specific logging for audit purposes
  security: (event: string, details?: any) => {
    const logData = {
      timestamp: new Date().toISOString(),
      event,
      details: details ? sanitizeData(details) : {}
    };
    
    if (isDevelopment) {
      console.log('[SECURITY]', logData);
    }
    // In production, should send to security monitoring system
    // This data should be logged even in production for security auditing
  }
};
