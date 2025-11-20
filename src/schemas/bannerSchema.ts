import { z } from 'zod';
import {
  MediaAssetSchemaCore,
  // TODO: Uncomment if AccentGraphic is needed. In the other case, remove.
  // AccentGraphicSchemaCore,
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
  sharedBannerRefinements,
  type ValidationResult
} from './bannerSchemaCore.js';
import {
  preprocessNumber,
  preprocessBoolean,
  preprocessDate,
  preprocessJSON,
  preprocessNullableObject
} from './validationHelpers.js';
import { BannerTemplateType, UrgencyLevel, CharterType, LayoutStyle, TextColour, BackgroundType } from '../types/index.js';

// API-specific schemas with preprocessing for FormData
export const MediaAssetSchema = MediaAssetSchemaCore;
// TODO: Uncomment if AccentGraphic is needed. In the other case, remove.
// export const AccentGraphicSchema = AccentGraphicSchemaCore;
export const BannerBackgroundSchema = BannerBackgroundSchemaCore;
export const CTAButtonSchema = CTAButtonSchemaCore;

export const DonationGoalSchema = z.preprocess(preprocessJSON, DonationGoalSchemaCore);

// API-specific schema for GivingCampaign to handle nested date preprocessing
export const GivingCampaignApiSchema = GivingCampaignSchemaCore.unwrap().extend({
  CampaignEndDate: z.preprocess(preprocessDate, z.date()).optional(),
});

export const ResourceFileSchema = z.preprocess(preprocessJSON, ResourceFileSchemaCore);

// API-specific schema for ResourceFile to handle nested date preprocessing
export const ResourceFileApiSchema = ResourceFileSchemaCore.extend({
  LastUpdated: z.preprocess(preprocessDate, z.date()),
}).optional();

// API-specific schema for ResourceProject to use ResourceFileApiSchema
export const ResourceProjectApiSchema = ResourceProjectSchemaCore.unwrap().extend({
  ResourceFile: ResourceFileApiSchema,
}).optional();

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
    preprocessNullableObject,
    z.array(CTAButtonSchema).max(3, 'Maximum 3 CTA buttons allowed').optional()
  ).optional(),
  Background: z.preprocess(preprocessJSON, BannerBackgroundSchema),
  GivingCampaign: z.preprocess(preprocessNullableObject, GivingCampaignApiSchema).optional(),
  PartnershipCharter: z.preprocess(preprocessNullableObject, PartnershipCharterSchemaCore).optional(),
  ResourceProject: z.preprocess(preprocessNullableObject, ResourceProjectApiSchema).optional(),

  // Audit fields (may come from form data during edits)
  CreatedBy: z.string().optional(),
  DocumentCreationDate: z.preprocess(preprocessDate, z.date()).optional(),
  DocumentModifiedDate: z.preprocess(preprocessDate, z.date()).optional(),
  _id: z.any().optional()
});

// Pre-upload validation schema - validates non-file fields before upload (API-specific)
// I don't know if we should validate fields with prefixes (newfile_, newmetadata_, existing_) because they are created automatically for new uploaded files and 
// taken from database for existing files.
export const BannerPreUploadApiSchema = z.object({
  // Core content
  Title: z.string().min(1, 'Title is required').max(50, 'Title must be 50 characters or less'),
  Description: z.string().max(200, 'Description must be 200 characters or less').optional(),
  Subtitle: z.string().max(50, 'Subtitle must be 50 characters or less').optional(),
  TemplateType: z.nativeEnum(BannerTemplateType),

  // Scheduling
  ShowDates: z.preprocess(preprocessBoolean, z.boolean()).optional(),
  StartDate: z.preprocess(preprocessDate, z.date()).optional(),
  EndDate: z.preprocess(preprocessDate, z.date()).optional(),
  BadgeText: z.string().max(25, 'Badge text must be 25 characters or less').optional(),

  // CMS metadata
  IsActive: z.preprocess(preprocessBoolean, z.boolean()).default(true),
  LocationSlug: z.string(),
  Priority: z.preprocess(preprocessNumber, z.number().min(1).max(10)).default(1),

  // Actions
  CtaButtons: z.preprocess(
    preprocessJSON,
    z.array(CTAButtonSchema).max(3, 'Maximum 3 CTA buttons allowed').optional()
  ).optional().default([]),

  // Styling (excluding file-based background)
  Background: z.preprocess(preprocessJSON, z.object({
    Type: z.nativeEnum(BackgroundType),
    Value: z.string().min(1, 'Background value is required'),
    Overlay: z.object({
      Colour: z.string().optional(),
      Opacity: z.preprocess(preprocessNumber, z.number().min(0).max(1)).optional()
    }).optional()
  })),
  TextColour: z.nativeEnum(TextColour),
  LayoutStyle: z.nativeEnum(LayoutStyle),

  // Template-specific fields (non-file parts only)
  GivingCampaign: z.preprocess(preprocessJSON, z.object({
    UrgencyLevel: z.nativeEnum(UrgencyLevel),
    CampaignEndDate: z.preprocess(preprocessDate, z.date()).optional(),
    DonationGoal: z.preprocess(preprocessJSON, DonationGoalSchemaCore),
  })).optional(),
  PartnershipCharter: z.preprocess(preprocessJSON, z.object({
    CharterType: z.nativeEnum(CharterType),
    SignatoriesCount: z.preprocess(preprocessNumber, z.number().min(0)).optional(),
    // PartnerLogos excluded from pre-upload validation
  })).optional(),
  ResourceProject: z.preprocess(preprocessJSON, z.object({
    // ResourceFile excluded from pre-upload validation
  })).optional(),
});

// Filter for refinements that are safe to run before file uploads
const preUploadRefinements = sharedBannerRefinements.filter(
  (ref) => ref.path?.[0] !== 'ResourceProject'
);

const PreUploadBannerSchemaWithRefinements = applySharedRefinements(
  BannerPreUploadApiSchema,
  preUploadRefinements
);

// Apply all refinements for the final validation
export const BannerSchema = applySharedRefinements(BannerApiBaseSchema);

// Validation functions using shared helper
export function validateBannerPreUpload(data: unknown): ValidationResult<z.output<typeof BannerPreUploadApiSchema>> {
  const result = PreUploadBannerSchemaWithRefinements.safeParse(data);
  return createValidationResult(result);
}

export function validateBanner(data: unknown): ValidationResult<z.output<typeof BannerSchema>> {
  const result = BannerSchema.safeParse(data);
  return createValidationResult(result);
}
