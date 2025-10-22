import { z } from 'zod';
import { ValidationResult, createValidationResult } from './validationHelpers.js';
import { OpeningTimeSchema, AddressSchema } from './organisationSchema.js';

// Preprocessing helpers
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

const preprocessBoolean = (val: unknown) => {
  if (typeof val === 'string') {
    if (val === 'true') return true;
    if (val === 'false') return false;
  }
  return val;
};

// Preprocessing helper to convert null/undefined to empty string
const preprocessNullableString = (val: unknown) => {
  if (val === null || val === undefined) return '';
  return val;
};

// Provided Service schema (works for both create and update)
// Controller should validate these requirements for create operations
export const ServiceSchema = z.object({
  ParentId: z.string().min(1, 'Parent ID is required').trim(),
  IsPublished: z.preprocess(preprocessBoolean, z.boolean()),
  ServiceProviderKey: z.string().min(1, 'Service provider key is required').trim(),
  ServiceProviderName: z.string().min(1, 'Service provider name is required').trim(),
  ParentCategoryKey: z.string().min(1, 'Parent category key is required').trim(),
  SubCategoryKey: z.string().min(1, 'Sub-category key is required').trim(),
  SubCategoryName: z.string().min(1, 'Sub-category name is required').trim(),
  Info: z.preprocess(preprocessNullableString, z.string().optional()),
  Tags: z.preprocess(preprocessJSON, z.array(z.string()).optional()),
  OpeningTimes: z.preprocess(
    preprocessJSON,
    z.array(OpeningTimeSchema)
    .min(1, 'At least one opening time is required')
  ),
  Address: z.preprocess(preprocessJSON, AddressSchema),
  LocationDescription: z.preprocess(preprocessNullableString, z.string().optional()),
});

// Validation function
export function validateProvidedService(data: unknown): ValidationResult<z.output<typeof ServiceSchema>> {
  const result = ServiceSchema.safeParse(data);
  return createValidationResult(result);
}
