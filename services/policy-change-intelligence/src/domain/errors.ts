export class NotFoundError extends Error {
  constructor(entity: string, id: string) { super(`${entity} not found: ${id}`); this.name = 'NotFoundError'; }
}
export class ForbiddenError extends Error {
  constructor(message = 'Access denied') { super(message); this.name = 'ForbiddenError'; }
}
