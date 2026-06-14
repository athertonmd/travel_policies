import { CallerContext } from '../domain/types';

/**
 * Authentication middleware interface.
 * In production, validates Cognito Bearer tokens (07-api-specification).
 */
export interface AuthProvider {
  /** Validate token and return caller context */
  authenticate(token: string | undefined): Promise<CallerContext | null>;
}

/**
 * In-memory auth provider for testing.
 */
export class InMemoryAuthProvider implements AuthProvider {
  private tokens = new Map<string, CallerContext>();

  /** Register a token for testing */
  registerToken(token: string, caller: CallerContext): void {
    this.tokens.set(token, caller);
  }

  async authenticate(token: string | undefined): Promise<CallerContext | null> {
    if (!token) return null;
    const stripped = token.replace('Bearer ', '');
    return this.tokens.get(stripped) ?? null;
  }

  clear(): void {
    this.tokens.clear();
  }
}
