import { z } from 'zod';
import { ROLE_VALIDATION_PATTERN } from '../constants/roles.js';
import { ValidationResult, createValidationResult, preprocessJSON } from './validationHelpers.js';

// User schema for API backend (for creation)
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

// User update schema (all fields optional)
export const UpdateUserSchema = z.object({
  Email: z
    .string()
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim()
    .optional(),
  UserName: z
    .string()
    .optional(),
  AuthClaims: z.preprocess(
    preprocessJSON,
    z
      .array(z.string())
      .min(1, 'At least one role is required')
      .refine(
        (claims) => {
          return claims.every(claim => ROLE_VALIDATION_PATTERN.test(claim));
        },
        { message: 'Invalid role format in AuthClaims' }
      )
      .optional()
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
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// Validation function for creation
export function validateUserCreate(data: unknown): ValidationResult<z.output<typeof UserSchema>> {
  const result = UserSchema.safeParse(data);
  return createValidationResult(result);
}

// Validation function for updates
export function validateUserUpdate(data: unknown): ValidationResult<z.output<typeof UpdateUserSchema>> {
  const result = UpdateUserSchema.safeParse(data);
  return createValidationResult(result);
}
