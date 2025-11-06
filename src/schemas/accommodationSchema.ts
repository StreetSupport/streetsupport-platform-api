import { z } from 'zod';
import { ValidationResult, createValidationResult } from './validationHelpers.js';
import { LocationCoordinatesSchema } from './organisationSchema.js';
import { AccommodationType, DiscretionaryValue, SupportOfferedType } from '../types/index.js';
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

// Preprocessing helper to convert null/undefined to empty string
const preprocessNullableString = (val: unknown) => {
  if (val === null || val === undefined) return '';
  return val;
};

// Preprocessing helper to convert null/undefined to empty string
const preprocessNullableObject = (val: unknown) => {
  if (val === null || val === undefined) return {};
  return preprocessJSON(val);
};

// Enum for discretionary values: 0 = No, 1 = Yes, 2 = Don't Know/Ask
const DiscretionaryValueSchema = z.nativeEnum(DiscretionaryValue);

// Nested schemas for accommodation sections
const GeneralInfoSchema = z.object({
  Name: z.string().min(1, 'Accommodation Name is required').trim(),
  Synopsis: z.preprocess(preprocessNullableString, z.string().optional()),
  Description: z.preprocess(preprocessNullableString, z.string().optional()),
  AccommodationType: z.nativeEnum(AccommodationType),
  ServiceProviderId: z.string().min(1, 'Service provider ID is required').trim(),
  ServiceProviderName: z.string().optional(),
  IsOpenAccess: z.preprocess(preprocessBoolean, z.boolean()),
  IsPubliclyVisible: z.preprocess(preprocessBoolean, z.boolean().optional()),
  IsPublished: z.preprocess(preprocessBoolean, z.boolean().optional()),
  IsVerified: z.preprocess(preprocessBoolean, z.boolean().optional()),
});

const PricingAndRequirementsInfoSchema = z.object({
  ReferralIsRequired: z.preprocess(preprocessBoolean, z.boolean()).default(false),
  ReferralNotes: z.preprocess(preprocessNullableString, z.string().optional()),
  Price: z.string().min(1, 'Price is required').trim(),
  FoodIsIncluded: z.preprocess(preprocessNumber, DiscretionaryValueSchema),
  AvailabilityOfMeals: z.preprocess(preprocessNullableString, z.string().optional()),
});

const ContactInformationSchema = z.object({
  Name: z.string().min(1, 'Contact name is required').trim(),
  Email: z.string().email('Invalid email address').min(1, 'Email is required').toLowerCase().trim(),
  Telephone: z.preprocess(preprocessNullableString, z.string().optional()),
  AdditionalInfo: z.preprocess(preprocessNullableString, z.string().optional()),
});

const AccommodationAddressSchema = z.object({
  Street1: z.string().min(1, 'Street is required').trim(),
  Street2: z.preprocess(preprocessNullableString, z.string().optional()),
  Street3: z.preprocess(preprocessNullableString, z.string().optional()),
  City: z.string().min(1, 'City is required').trim(),
  Postcode: z.string().min(1, 'Postcode is required').trim().refine((postcode) => {
    return isValidPostcodeFormat(postcode);
  }, {
    message: 'Invalid postcode format'
  }),
  Location: z.preprocess(preprocessJSON, LocationCoordinatesSchema.optional()),
  AssociatedCityId: z.string().min(1, 'Associated city ID is required').trim(),
});

const FeaturesWithDiscretionarySchema = z.object({
  AcceptsHousingBenefit: z.preprocess(preprocessNumber, DiscretionaryValueSchema.optional()),
  AcceptsPets: z.preprocess(preprocessNumber, DiscretionaryValueSchema.optional()),
  AcceptsCouples: z.preprocess(preprocessNumber, DiscretionaryValueSchema.optional()),
  HasDisabledAccess: z.preprocess(preprocessNumber, DiscretionaryValueSchema.optional()),
  IsSuitableForWomen: z.preprocess(preprocessNumber, DiscretionaryValueSchema.optional()),
  IsSuitableForYoungPeople: z.preprocess(preprocessNumber, DiscretionaryValueSchema.optional()),
  HasSingleRooms: z.preprocess(preprocessNumber, DiscretionaryValueSchema.optional()),
  HasSharedRooms: z.preprocess(preprocessNumber, DiscretionaryValueSchema.optional()),
  HasShowerBathroomFacilities: z.preprocess(preprocessNumber, DiscretionaryValueSchema.optional()),
  HasAccessToKitchen: z.preprocess(preprocessNumber, DiscretionaryValueSchema.optional()),
  HasLaundryFacilities: z.preprocess(preprocessNumber, DiscretionaryValueSchema.optional()),
  HasLounge: z.preprocess(preprocessNumber, DiscretionaryValueSchema.optional()),
  AllowsVisitors: z.preprocess(preprocessNumber, DiscretionaryValueSchema.optional()),
  HasOnSiteManager: z.preprocess(preprocessNumber, DiscretionaryValueSchema.optional()),
  AdditionalFeatures: z.preprocess(preprocessNullableString, z.string().optional()),
});

const ResidentCriteriaInfoSchema = z.object({
  AcceptsMen: z.preprocess(preprocessBoolean, z.boolean().optional()),
  AcceptsWomen: z.preprocess(preprocessBoolean, z.boolean().optional()),
  AcceptsCouples: z.preprocess(preprocessBoolean, z.boolean().optional()),
  AcceptsYoungPeople: z.preprocess(preprocessBoolean, z.boolean().optional()),
  AcceptsFamilies: z.preprocess(preprocessBoolean, z.boolean().optional()),
  AcceptsBenefitsClaimants: z.preprocess(preprocessBoolean, z.boolean().optional()),
});

const SupportProvidedInfoSchema = z.object({
  SupportOffered: z.preprocess(preprocessJSON, z.array(z.nativeEnum(SupportOfferedType)).optional()),
  SupportInfo: z.preprocess(preprocessNullableString, z.string().optional()),
});

// Accommodation schema (works for both create and update)
// For CREATE operations, required nested fields:
// - GeneralInfo: Name, AccommodationType, ServiceProviderId, IsOpenAccess
// - PricingAndRequirementsInfo: ReferralIsRequired, Price, FoodIsIncluded
// - ContactInformation: Name, Email
// - Address: Street1, City, Postcode, AssociatedCityId
// Controller should validate these requirements for create operations
export const AccommodationSchema = z.object({
  GeneralInfo: z.preprocess(preprocessJSON, GeneralInfoSchema.partial()),
  PricingAndRequirementsInfo: z.preprocess(preprocessJSON, PricingAndRequirementsInfoSchema),
  ContactInformation: z.preprocess(preprocessJSON, ContactInformationSchema),
  Address: z.preprocess(preprocessJSON, AccommodationAddressSchema),
  FeaturesWithDiscretionary: z.preprocess(preprocessNullableObject, FeaturesWithDiscretionarySchema.optional()),
  ResidentCriteriaInfo: z.preprocess(preprocessNullableObject, ResidentCriteriaInfoSchema.optional()),
  SupportProvidedInfo: z.preprocess(preprocessNullableObject, SupportProvidedInfoSchema.optional()),
});

// Validation function
export function validateAccommodation(data: unknown): ValidationResult<z.output<typeof AccommodationSchema>> {
  const result = AccommodationSchema.safeParse(data);
  return createValidationResult(result);
}
