import { z } from 'zod';

// Shared validation function structure
export interface ValidationResult<T> {
  success: boolean;
  errors: Array<{ path: string; message: string; code: string }>;
  data: T | undefined;
}

// Helper function to create validation result from Zod result
// Define a local type compatible with Zod's safeParse result to avoid depending on non-exported classic types
type ZodSafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: z.ZodError };

export function createValidationResult<T>(result: ZodSafeParseResult<T>): ValidationResult<T> {
  if (!result.success) {
    const errors = result.error.issues.map((issue: z.ZodIssue) => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code
    }));

    return {
      success: false,
      errors,
      data: undefined
    };
  }

  return {
    success: true,
    errors: [],
    data: result.data
  };
}

// Helper function to get field-specific errors
export function getFieldErrors(
  errors: Array<{ path: string; message: string; code: string }>,
  fieldPath: string
): string[] {
  return errors
    .filter(error => error.path === fieldPath || error.path.startsWith(`${fieldPath}.`))
    .map(error => error.message);
}
