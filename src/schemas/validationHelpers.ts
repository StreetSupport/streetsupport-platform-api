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

// ============================================================================
// Preprocessing Helpers for Zod Schemas
// ============================================================================

/**
 * Parses JSON strings to objects
 * Used for FormData fields that contain JSON strings
 */
export const preprocessJSON = (val: unknown) => {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
};

/**
 * Converts string booleans to actual booleans
 * Used for FormData fields that contain 'true' or 'false' strings
 */
export const preprocessBoolean = (val: unknown) => {
  if (typeof val === 'string') {
    if (val === 'true') return true;
    if (val === 'false') return false;
  }
  return val;
};

/**
 * Converts string numbers to actual numbers
 * Used for FormData fields that contain numeric strings
 */
export const preprocessNumber = (val: unknown) => {
  if (typeof val === 'string') {
    const parsed = Number(val);
    if (!isNaN(parsed)) return parsed;
  }
  return val;
};

/**
 * Converts string dates to Date objects
 * Handles quoted date strings from FormData: "\"2025-09-21T16:26:00.000Z\""
 */
export const preprocessDate = (val: unknown) => {
  if (typeof val === 'string') {
    // Handle quoted date strings from FormData
    const cleanedStr = val.replace(/^"|"$/g, '');
    if (cleanedStr) {
      const date = new Date(cleanedStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  if (val instanceof Date) {
    return val;
  }
  return val;
};

/**
 * Converts null/undefined to empty string
 * Used for optional string fields that should default to empty string
 */
export const preprocessNullableString = (val: unknown) => {
  if (val === null || val === undefined) return '';
  return val;
};

/**
 * Converts null/undefined to empty object, with JSON parsing
 * Used for optional object fields that should default to empty object
 */
export const preprocessNullableObject = (val: unknown) => {
  if (val === null || val === undefined) return {};
  return preprocessJSON(val);
};
