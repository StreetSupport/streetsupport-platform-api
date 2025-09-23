import { z } from 'zod';
import {
  MediaAssetSchemaCore,
  AccentGraphicSchemaCore,
  BannerBackgroundSchemaCore,
  CTAButtonSchemaCore,
  DonationGoalSchemaCore,
  ResourceFileSchemaCore,
  GivingCampaignSchemaCore,
  PartnershipCharterSchemaCore,
  ResourceProjectSchemaCore,
  BannerSchemaCore,
  applySharedRefinements,
  createValidationResult,
  type ValidationResult
} from './bannerSchemaCore.js';

// Helper function to preprocess FormData strings to proper types
const preprocessString = (val: unknown) => {
  if (typeof val === 'string') {
    // Handle quoted JSON strings from FormData
    if (val.startsWith('"') && val.endsWith('"')) {
      return val.slice(1, -1);
    }
    return val;
  }
  return val;
};

const preprocessNumber = (val: unknown) => {
  if (typeof val === 'string') {
    const num = parseFloat(val);
    return isNaN(num) ? val : num;
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

const preprocessDate = (val: unknown) => {
  if (typeof val === 'string') {
    // Handle quoted date strings from FormData
    const dateStr = val.startsWith('"') && val.endsWith('"') ? val.slice(1, -1) : val;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? val : date;
  }
  return val;
};

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

// API-specific schemas with preprocessing for FormData
export const MediaAssetSchema = MediaAssetSchemaCore;
export const AccentGraphicSchema = AccentGraphicSchemaCore;
export const BannerBackgroundSchema = BannerBackgroundSchemaCore;
export const CTAButtonSchema = CTAButtonSchemaCore;

export const DonationGoalSchema = z.preprocess(preprocessJSON, DonationGoalSchemaCore);

// API-specific schema for GivingCampaign to handle nested date preprocessing
export const GivingCampaignApiSchema = GivingCampaignSchemaCore.unwrap().extend({
  CampaignEndDate: z.preprocess(preprocessDate, z.date()).optional(),
});

export const ResourceFileSchema = z.preprocess(preprocessJSON, ResourceFileSchemaCore);

// API-specific schema for ResourceFile to handle LastUpdated date preprocessing
export const ResourceFileApiSchema = ResourceFileSchemaCore.extend({
  LastUpdated: z.preprocess(preprocessDate, z.date()).optional(),
});

// API-specific schema for ResourceProject to use ResourceFileApiSchema
export const ResourceProjectApiSchema = ResourceProjectSchemaCore.unwrap().extend({
  ResourceFile: ResourceFileApiSchema.optional(),
});

// Main Banner Schema for API: omits fields needing JSON parsing and then extends with preprocessing.
const BannerApiBaseSchema = BannerSchemaCore.omit({
  CtaButtons: true,
  Background: true,
  GivingCampaign: true,
  PartnershipCharter: true,
  ResourceProject: true,
  // Primitives that need preprocessing
  ShowDates: true,
  IsActive: true,
  Priority: true,
  StartDate: true,
  EndDate: true
}).extend({
  // Add back omitted fields with JSON preprocessing for FormData
  ShowDates: z.preprocess(preprocessBoolean, z.boolean()).optional(),
  IsActive: z.preprocess(preprocessBoolean, z.boolean()).default(true),
  Priority: z.preprocess(preprocessNumber, z.number().min(1).max(10)).default(1),
  StartDate: z.preprocess(preprocessDate, z.date()).optional(),
  EndDate: z.preprocess(preprocessDate, z.date()).optional(),
  CtaButtons: z.preprocess(
    preprocessJSON,
    z.array(CTAButtonSchema).max(3, 'Maximum 3 CTA buttons allowed').optional()
  ).optional(),
  Background: z.preprocess(preprocessJSON, BannerBackgroundSchema),
  GivingCampaign: z.preprocess(preprocessJSON, GivingCampaignApiSchema).optional(),
  PartnershipCharter: z.preprocess(preprocessJSON, PartnershipCharterSchemaCore).optional(),
  ResourceProject: z.preprocess(preprocessJSON, ResourceProjectApiSchema).optional(),

  // Audit fields (may come from form data during edits)
  CreatedBy: z.string().optional(),
  DocumentCreationDate: z.preprocess(preprocessDate, z.date()).optional(),
  DocumentModifiedDate: z.preprocess(preprocessDate, z.date()).optional(),
  _id: z.any().optional()
});

export const BannerSchema = applySharedRefinements(BannerApiBaseSchema);

// Type exports
export type BannerInput = z.input<typeof BannerSchema>;
export type BannerOutput = z.output<typeof BannerSchema>;

// Validation functions using shared helper
export function validateBanner(data: unknown): ValidationResult<BannerOutput> {
  const result = BannerSchema.safeParse(data);
  return createValidationResult(result);
}
