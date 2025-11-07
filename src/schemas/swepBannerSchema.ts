import { z } from 'zod';
import { 
  ValidationResult, 
  createValidationResult,
  preprocessJSON, 
  preprocessBoolean, 
  preprocessDate, 
  preprocessNullableString, 
  preprocessNullableObject 
} from './validationHelpers.js';

// Emergency Contact schema
const EmergencyContactSchema = z.object({
  phone: z.preprocess(preprocessNullableString, z.string().optional()),
  email: z.preprocess(preprocessNullableString, z.string().email('Invalid emergency email address').optional()),
  hours: z.preprocess(preprocessNullableString, z.string().optional())
});

// SWEP Banner validation schema
export const SwepBannerSchema = z.object({
  locationSlug: z.string().min(1, 'Location is required'),
  title: z.string().min(1, 'Title is required'),
  body: z.string().min(1, 'Body content is required'),
  shortMessage: z.string().min(1, 'Short message is required'),
  
  // Image field - required for SWEP banners
  image: z.string().min(1, 'Image is required'),
  
  // Date fields with preprocessing
  swepActiveFrom: z.preprocess(preprocessDate, z.date().optional()),
  swepActiveUntil: z.preprocess(preprocessDate, z.date().optional()),
  isActive: z.preprocess(preprocessBoolean, z.boolean()).default(false),
  
  // Emergency contact
  emergencyContact: z.preprocess(preprocessNullableObject, EmergencyContactSchema.optional())
}).refine((data) => {
  // If date range is set, swepActiveFrom must be before swepActiveUntil
  if (data.swepActiveFrom && data.swepActiveUntil) {
    return data.swepActiveFrom < data.swepActiveUntil;
  }
  
  return true;
}, {
  message: 'SWEP active from date must be before active until date',
  path: ['swepActiveUntil']
});

// Validation function
export function validateSwepBanner(data: unknown): ValidationResult<z.output<typeof SwepBannerSchema>> {
  const result = SwepBannerSchema.safeParse(data);
  return createValidationResult(result);
}