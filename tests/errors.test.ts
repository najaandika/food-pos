import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { handleApiError, validationErrorResponse } from '../lib/errors';

describe('API error responses', () => {
  it('returns structured validation errors', async () => {
    const schema = z.object({ name: z.string().min(1) });
    const result = schema.safeParse({ name: '' });
    if (result.success) throw new Error('Expected validation to fail');

    const response = validationErrorResponse(result.error);

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      fields: { name: expect.any(String) },
    });
  });

  it('returns a stable response for malformed JSON', async () => {
    const response = handleApiError(new SyntaxError('Unexpected token'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid JSON',
      code: 'INVALID_JSON',
    });
  });
});
