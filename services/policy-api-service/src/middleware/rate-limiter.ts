/**
 * Rate limiter interface (07-api-specification: 1000 req/min/tenant).
 * In production, integrates with API Gateway throttling.
 */
export interface RateLimiter {
  /** Check if request is allowed. Returns true if within limits. */
  isAllowed(tenantId: string): boolean;
  /** Reset counters (for testing) */
  reset(): void;
}

export interface RateLimiterConfig {
  maxRequestsPerMinute: number;
}

/**
 * In-memory rate limiter for testing.
 */
export class InMemoryRateLimiter implements RateLimiter {
  private counters = new Map<string, { count: number; resetAt: number }>();
  private readonly maxRequests: number;

  constructor(config: RateLimiterConfig = { maxRequestsPerMinute: 1000 }) {
    this.maxRequests = config.maxRequestsPerMinute;
  }

  isAllowed(tenantId: string): boolean {
    const now = Date.now();
    const entry = this.counters.get(tenantId);

    if (!entry || now > entry.resetAt) {
      this.counters.set(tenantId, { count: 1, resetAt: now + 60000 });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  reset(): void {
    this.counters.clear();
  }
}
