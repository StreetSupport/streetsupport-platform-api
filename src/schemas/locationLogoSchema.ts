import { z } from 'zod';
import { 
  ValidationResult, 
  createValidationResult
} from './validationHelpers.js';

/**
 * Core Location Logo Schema
 * Used for validation on both client and server
 */
export const LocationLogoSchemaCore = z.object({
  Name: z.string().min(1, 'Name is required'),
  DisplayName: z.string().min(1, 'Display name is required'),
  LocationSlug: z.string().min(1, 'Location slug is required'),
  LocationName: z.string().min(1, 'Location name is required'),
  LogoPath: z.string().min(1, 'Logo is required'),
  Url: z.string().url('Must be a valid URL').min(1, 'URL is required'),
});

/**
 * Location Logo Schema for API (handles FormData)
 */
export const LocationLogoSchema = LocationLogoSchemaCore;

/**
 * Type inferred from schema
 */
export type LocationLogoInput = z.infer<typeof LocationLogoSchema>;

/**
 * Validate location logo data
 */
export function validateLocationLogo(data: unknown): ValidationResult<LocationLogoInput> {
  const result = LocationLogoSchema.safeParse(data);
  return createValidationResult(result);
}