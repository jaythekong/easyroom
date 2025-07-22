// Client-side rate limiting utility
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 15 * 60 * 1000 // 15 minutes
  ) {}
  
  canAttempt(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove attempts outside the time window
    const recentAttempts = attempts.filter(time => now - time < this.windowMs);
    
    if (recentAttempts.length >= this.maxAttempts) {
      return false;
    }
    
    return true;
  }
  
  recordAttempt(key: string): void {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Add current attempt and clean up old ones
    const recentAttempts = [...attempts, now].filter(time => now - time < this.windowMs);
    
    this.attempts.set(key, recentAttempts);
  }
  
  getRemainingTime(key: string): number {
    const attempts = this.attempts.get(key) || [];
    if (attempts.length === 0) return 0;
    
    const oldestAttempt = Math.min(...attempts);
    const timeLeft = this.windowMs - (Date.now() - oldestAttempt);
    
    return Math.max(0, Math.ceil(timeLeft / 1000 / 60)); // Return minutes
  }
  
  reset(key: string): void {
    this.attempts.delete(key);
  }
}

// Singleton instances for different rate limiting scenarios
export const authRateLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes
export const passwordResetRateLimiter = new RateLimiter(3, 60 * 60 * 1000); // 3 attempts per hour