import { z } from 'zod';
import { ROLE_VALIDATION_PATTERN } from '../constants/roles.js';
import { ValidationResult, createValidationResult } from './validationHelpers.js';

// Preprocessing helper for JSON strings
const preprocessJSON = (val: unknown) => {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
};

// User schema for API backend (works for both create and update)
export const UserSchema = z.object({
  Email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
  UserName: z
    .string().optional(),
  AuthClaims: z.preprocess(
    preprocessJSON,
    z
      .array(z.string())
      .min(1, 'At least one role is required')
      .refine(
        (claims) => {
          // Ensure AuthClaims contains valid role formats
          return claims.every(claim => ROLE_VALIDATION_PATTERN.test(claim));
        },
        { message: 'Invalid role format in AuthClaims' }
      )
  ),
  AssociatedProviderLocationIds: z.preprocess(
    preprocessJSON,
    z.array(z.string()).optional()
  ),
  IsActive: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        if (val === 'true') return true;
        if (val === 'false') return false;
      }
      return val;
    },
    z.boolean().optional()
  ),
});

// Validation function
export function validateUser(data: unknown): ValidationResult<z.output<typeof UserSchema>> {
  const result = UserSchema.safeParse(data);
  return createValidationResult(result);
}
