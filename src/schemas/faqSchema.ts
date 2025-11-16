import { z } from 'zod';
import { ValidationResult, createValidationResult } from './validationHelpers.js';

// FAQ validation schema
export const FaqSchema = z.object({
  LocationKey: z.string().min(1, 'Location is required'),
  Title: z.string().min(1, 'Title is required').max(200, 'Title must not exceed 200 characters'),
  Body: z.string().min(1, 'Body content is required'),
  SortPosition: z.number().int('Sort position must be an integer').min(1, 'Sort position must be 1 or greater')
});

// Validation function
export function validateFaq(data: unknown): ValidationResult<z.output<typeof FaqSchema>> {
  const result = FaqSchema.safeParse(data);
  return createValidationResult(result);
}

export type FaqSchemaType = z.infer<typeof FaqSchema>;
