import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends ApiError {
  constructor(
    public fields: Record<string, string>,
    message = 'Validation failed',
  ) {
    super(422, 'VALIDATION_ERROR', message);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(404, 'NOT_FOUND', message);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(403, 'FORBIDDEN', message);
  }
}

export function toValidationError(error: ZodError): ValidationError {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'root';
    fields[path] = issue.message;
  }
  return new ValidationError(fields);
}

export function handleApiError(error: unknown) {
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message, code: error.code, fields: error.fields }, { status: error.statusCode });
  }
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
  }
  if (error instanceof ZodError) {
    const validation = toValidationError(error);
    return NextResponse.json({ error: validation.message, code: validation.code, fields: validation.fields }, { status: validation.statusCode });
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: 'Invalid JSON', code: 'INVALID_JSON' }, { status: 400 });
  }
  console.error('Unhandled API error:', error);
  const message = error instanceof Error ? error.message : 'Internal server error';
  // Map known validation messages to 400, otherwise 500 for unexpected
  const isValidationMessage = message.includes('required') || message.includes('must be') || message.includes('invalid') || message.includes('Valid');
  return NextResponse.json({ error: message, code: 'INTERNAL_ERROR' }, { status: isValidationMessage ? 400 : 500 });
}
