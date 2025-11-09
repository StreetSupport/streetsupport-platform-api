import { z } from 'zod';
import { 
  ValidationResult, 
  createValidationResult,
  preprocessBoolean, 
  preprocessDate, 
  preprocessNullableString, 
  preprocessNullableObject 
} from './validationHelpers.js';

// Emergency Contact schema
const EmergencyContactSchema = z.object({
  Phone: z.preprocess(preprocessNullableString, z.string().optional()),
  Email: z.preprocess(preprocessNullableString, z.string().email('Invalid emergency email address').optional()),
  Hours: z.preprocess(preprocessNullableString, z.string().optional())
});

// SWEP Banner validation schema
export const SwepBannerSchema = z.object({
  LocationSlug: z.string().min(1, 'Location is required'),
  Title: z.string().min(1, 'Title is required'),
  Body: z.string().min(1, 'Body content is required'),
  ShortMessage: z.string().min(1, 'Short message is required'),
  
  // Image field - required for SWEP banners
  Image: z.string().optional().nullable(),
  
  // Date fields with preprocessing - allow null values
  SwepActiveFrom: z.preprocess(preprocessDate, z.date().optional().nullable()),
  SwepActiveUntil: z.preprocess(preprocessDate, z.date().optional().nullable()),
  IsActive: z.preprocess(preprocessBoolean, z.boolean()).default(false),
  
  // Emergency contact
  EmergencyContact: z.preprocess(preprocessNullableObject, EmergencyContactSchema.optional())
}).refine((data) => {
  // If date range is set, SwepActiveFrom must be before SwepActiveUntil
  if (data.SwepActiveFrom && data.SwepActiveUntil) {
    return data.SwepActiveFrom < data.SwepActiveUntil;
  }
  
  return true;
}, {
  message: 'SWEP active from date must be before active until date',
  path: ['SwepActiveUntil']
});

// Validation function
export function validateSwepBanner(data: unknown): ValidationResult<z.output<typeof SwepBannerSchema>> {
  const result = SwepBannerSchema.safeParse(data);
  return createValidationResult(result);
}