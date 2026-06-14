/**
 * Domain errors for the Review Service.
 */

export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Access denied') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends Error {
  public readonly details: unknown;
  constructor(message: string, details?: unknown) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class ReviewCompletionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReviewCompletionError';
  }
}
