import { z } from 'zod';
import { ValidationResult, createValidationResult } from './validationHelpers.js';
import { isValidPostcodeFormat } from '../utils/postcodeValidation.js';

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

const preprocessNumber = (val: unknown) => {
  if (typeof val === 'string') {
    const parsed = Number(val);
    if (!isNaN(parsed)) return parsed;
  }
  return val;
};

// Nested schemas for service provider components
export const LocationCoordinatesSchema = z.object({
  type: z.string().min(1, 'Location type is required'),
  coordinates: z.tuple([z.number(), z.number()]),
});

export const OpeningTimeSchema = z.object({
  Day: z.preprocess(preprocessNumber, z.number().min(0).max(6, 'Day must be between 0 (Sunday) and 6 (Saturday)')),
  StartTime: z.preprocess(preprocessNumber, z.number().min(0).max(2359, 'Start time must be between 0 and 2359')),
  EndTime: z.preprocess(preprocessNumber, z.number().min(0).max(2359, 'End time must be between 0 and 2359')),
}).refine((data) => {
  return data.StartTime < data.EndTime;
}, {
  message: 'End time must be after start time',
  path: ['EndTime']
});

// Preprocessing helper to convert null/undefined to empty string
const preprocessNullableString = (val: unknown) => {
  if (val === null || val === undefined) return '';
  return val;
};

export const AddressSchema = z.object({
  Street: z.string().min(1, 'Street is required').trim(),
  Street1: z.preprocess(preprocessNullableString, z.string().optional()),
  Street2: z.preprocess(preprocessNullableString, z.string().optional()),
  Street3: z.preprocess(preprocessNullableString, z.string().optional()),
  City: z.preprocess(preprocessNullableString, z.string().optional()),
  Postcode: z.string().min(1, 'Postcode is required').trim().refine((postcode) => {
    return isValidPostcodeFormat(postcode);
  }, {
    message: 'Invalid postcode format'
  }),
  Telephone: z.preprocess(preprocessNullableString, z.string().optional()),
  IsOpen247: z.preprocess(preprocessBoolean, z.boolean().optional()),
  IsAppointmentOnly: z.preprocess(preprocessBoolean, z.boolean().optional()),
  Location: z.preprocess(preprocessJSON, LocationCoordinatesSchema.optional()),
  OpeningTimes: z.preprocess(preprocessJSON, z.array(OpeningTimeSchema).default([])),
}).refine((data) => {
  // If not open 24/7 and not appointment only, must have at least one opening time
  if (!data.IsOpen247 && !data.IsAppointmentOnly) {
    return data.OpeningTimes.length > 0;
  }
  return true;
}, {
  message: 'At least one opening time is required when location is not open 24/7 and not appointment only',
  path: ['OpeningTimes']
});

// Service Provider schema (works for both create and update)
// Controller should validate these requirements for create operations
export const OrganisationSchema = z.object({
  // General Details
  Key: z.string().min(1, 'Key is required').trim(),
  AssociatedLocationIds: z.preprocess(
    preprocessJSON,
    z.array(z.string()).min(1, 'At least one associated location is required')
  ),
  Name: z.string().min(1, 'Name is required').trim(),
  ShortDescription: z.string().min(1, 'Short description is required'),
  Description: z.string().min(1, 'Description is required'),
  Tags: z.preprocess(preprocessNullableString, z.string().optional()),

  // Contact Information
  Telephone: z.preprocess(preprocessNullableString, z.string().optional()),
  Email: z.preprocess(preprocessNullableString, z.string().email('Invalid email address').optional().or(z.literal(''))),
  Website: z.preprocess(preprocessNullableString, z.string().url('Invalid website URL').optional().or(z.literal(''))),
  Facebook: z.preprocess(preprocessNullableString, z.string().url('Invalid Facebook URL').optional().or(z.literal(''))),
  Twitter: z.preprocess(preprocessNullableString, z.string().url('Invalid Twitter URL').optional().or(z.literal(''))),
  Bluesky: z.preprocess(preprocessNullableString, z.string().url('Invalid Bluesky URL').optional().or(z.literal(''))),
  
  // Locations
  Addresses: z.preprocess(preprocessJSON, z.array(AddressSchema).optional().default([])),

  // System fields
  IsVerified: z.preprocess(preprocessBoolean, z.boolean()).default(false),
  IsPublished: z.preprocess(preprocessBoolean, z.boolean()).default(false),
});

// Validation function
export function validateOrganisation(data: unknown): ValidationResult<z.output<typeof OrganisationSchema>> {
  const result = OrganisationSchema.safeParse(data);
  return createValidationResult(result);
}
