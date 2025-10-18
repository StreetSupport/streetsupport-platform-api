import { z } from 'zod';
import { ValidationResult, createValidationResult } from './validationHelpers.js';

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

const preprocessDate = (val: unknown) => {
  if (typeof val === 'string') {
    // Handle quoted date strings
    const dateStr = val.replace(/^"(.*)"$/, '$1');
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;
  }
  if (val instanceof Date) return val;
  return val;
};

// Nested schemas for service provider components
export const LocationCoordinatesSchema = z.object({
  type: z.string().min(1, 'Location type is required'),
  coordinates: z.tuple([z.number(), z.number()]),
});

export const OpeningTimeSchema = z.object({
  StartTime: z.preprocess(preprocessNumber, z.number().min(0).max(2359, 'Start time must be between 0 and 2359')),
  EndTime: z.preprocess(preprocessNumber, z.number().min(0).max(2359, 'End time must be between 0 and 2359')),
  Day: z.preprocess(preprocessNumber, z.number().min(0).max(6, 'Day must be between 0 (Sunday) and 6 (Saturday)')),
});

export const AddressSchema = z.object({
  Primary: z.preprocess(preprocessBoolean, z.boolean()).optional(),
  Key: z.string().min(1, 'Address key is required').trim(),
  Street: z.string().min(1, 'Street is required').trim(),
  Street1: z.string().optional(),
  Street2: z.string().optional(),
  Street3: z.string().optional(),
  City: z.string().optional(),
  Postcode: z.string().min(1, 'Postcode is required').trim(),
  Telephone: z.string().optional(),
  IsOpen247: z.preprocess(preprocessBoolean, z.boolean().optional()),
  IsAppointmentOnly: z.preprocess(preprocessBoolean, z.boolean().optional()),
  Location: z.preprocess(preprocessJSON, LocationCoordinatesSchema.optional()),
  OpeningTimes: z.preprocess(preprocessJSON, z.array(OpeningTimeSchema).default([])),
  // OpeningTimes: z
  //   .array(OpeningTimeSchema)
  //   .min(1, 'At least one opening time is required'),
});

export const NoteSchema = z.object({
  CreationDate: z.preprocess(preprocessDate, z.date()),
  Date: z.preprocess(preprocessDate, z.date()),
  StaffName: z.string().min(1, 'Staff name is required').trim(),
  Reason: z.string().min(1, 'Reason is required'),
});

// Service Provider schema (works for both create and update)
// Controller should validate these requirements for create operations
export const OrganisationSchema = z.object({
  Key: z.string().min(1, 'Key is required').trim(),
  AssociatedLocationIds: z.preprocess(
    preprocessJSON,
    z.array(z.string()).min(1, 'At least one associated location is required')
  ),
  Name: z.string().min(1, 'Name is required').trim(),
  ShortDescription: z
    .string()
    .max(50, 'Short description must be 50 characters or less')
    .trim(),
  Description: z.string().min(1, 'Description is required'),
  IsVerified: z.preprocess(preprocessBoolean, z.boolean()),
  IsPublished: z.preprocess(preprocessBoolean, z.boolean()),
  RegisteredCharity: z.preprocess(preprocessNumber, z.number().optional()),
  AreaServiced: z.string().optional(),
  Tags: z.string().optional(),
  DonationUrl: z.string().url('Invalid donation URL').optional().or(z.literal('')),
  DonationDescription: z.string().optional(),
  ItemsDonationUrl: z.string().url('Invalid items donation URL').optional().or(z.literal('')),
  ItemsDonationDescription: z.string().optional(),
  Email: z.string().email('Invalid email address').toLowerCase().trim().optional().or(z.literal('')),
  Telephone: z.string().optional(),
  Website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  Facebook: z.string().optional(),
  Twitter: z.string().optional(),
  Addresses: z.preprocess(preprocessJSON, z.array(AddressSchema).optional().default([])),
  Notes: z.preprocess(preprocessJSON, z.array(NoteSchema).optional().default([])),
});

// Validation function
export function validateOrganisation(data: unknown): ValidationResult<z.output<typeof OrganisationSchema>> {
  const result = OrganisationSchema.safeParse(data);
  return createValidationResult(result);
}
