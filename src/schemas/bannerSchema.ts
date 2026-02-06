import { z } from 'zod';
import {
  MediaAssetSchemaCore,
  BannerBackgroundSchemaCore,
  BannerBorderSchemaCore,
  CTAButtonSchemaCore,
  UploadedFileSchemaCore,
  BannerSchemaBase,
  applySharedRefinements,
  createValidationResult,
  sharedBannerRefinements,
  youtubeUrlRegex,
  type ValidationResult
} from './bannerSchemaCore.js';
import {
  preprocessNumber,
  preprocessBoolean,
  preprocessDate,
  preprocessJSON,
  preprocessNullableObject,
  preprocessOptionalObject
} from './validationHelpers.js';
import { LayoutStyle, TextColour, MediaType, BackgroundType } from '../types/index.js';

// API-specific schemas with preprocessing for FormData
export const MediaAssetSchema = MediaAssetSchemaCore;
export const BannerBackgroundSchema = BannerBackgroundSchemaCore;
export const CTAButtonSchema = CTAButtonSchemaCore;
export const UploadedFileSchema = UploadedFileSchemaCore;

// Main Banner Schema for API: omits fields needing JSON parsing and then extends with preprocessing.
const BannerApiBaseSchema = BannerSchemaBase.omit({
  CtaButtons: true,
  Background: true,
  Border: true,
  UploadedFile: true,
  // Primitives that need preprocessing
  IsActive: true,
  Priority: true,
  StartDate: true,
  EndDate: true
}).extend({
  // Add back omitted fields with JSON preprocessing for FormData
  IsActive: z.preprocess(preprocessBoolean, z.boolean()).default(true),
  Priority: z.preprocess(preprocessNumber, z.number().min(1).max(10)).default(1),
  StartDate: z.preprocess(preprocessDate, z.date()).optional(),
  EndDate: z.preprocess(preprocessDate, z.date()).optional(),
  CtaButtons: z.preprocess(
    preprocessNullableObject,
    z.array(CTAButtonSchema).max(3, 'Maximum 3 CTA buttons allowed').optional()
  ).optional(),
  Background: z.preprocess(preprocessJSON, BannerBackgroundSchema),
  Border: z.preprocess(preprocessOptionalObject, BannerBorderSchemaCore).optional(),
  UploadedFile: z.preprocess(preprocessOptionalObject, UploadedFileSchemaCore).optional(),

  // Audit fields (may come from form data during edits)
  CreatedBy: z.string().optional(),
  DocumentCreationDate: z.preprocess(preprocessDate, z.date()).optional(),
  DocumentModifiedDate: z.preprocess(preprocessDate, z.date()).optional(),
  _id: z.any().optional()
}).refine(
  (data) => {
    if (data.StartDate && data.EndDate) {
      return data.StartDate <= data.EndDate;
    }
    return true;
  },
  {
    message: 'End date must be after start date',
    path: ['EndDate']
  }
).refine(
  (data) => data.MediaType !== MediaType.YOUTUBE || !!data.YouTubeUrl,
  {
    message: 'YouTube URL is required when media type is YouTube',
    path: ['YouTubeUrl']
  }
);

// Pre-upload validation schema - validates non-file fields before upload (API-specific)
export const BannerPreUploadApiSchema = z.object({
  // Core content
  Title: z.string().min(1, 'Title is required').max(100, 'Title must be 100 characters or less'),
  Description: z.string().max(2000, 'Description must be 2000 characters or less').optional(),
  Subtitle: z.string().max(50, 'Subtitle must be 50 characters or less').optional(),

  // Media
  MediaType: z.nativeEnum(MediaType).default(MediaType.IMAGE),
  YouTubeUrl: z.string()
    .refine(
      (v) => !v || youtubeUrlRegex.test(v),
      'Must be a valid YouTube URL'
    )
    .optional(),

  // Scheduling
  StartDate: z.preprocess(preprocessDate, z.date()).optional(),
  EndDate: z.preprocess(preprocessDate, z.date()).optional(),

  // CMS metadata
  IsActive: z.preprocess(preprocessBoolean, z.boolean()).default(true),
  LocationSlug: z.string(),
  Priority: z.preprocess(preprocessNumber, z.number().min(1).max(10)).default(1),

  // Actions
  CtaButtons: z.preprocess(
    preprocessJSON,
    z.array(CTAButtonSchema).max(3, 'Maximum 3 CTA buttons allowed').optional()
  ).optional().default([]),

  // Styling
  Background: z.preprocess(preprocessJSON, z.object({
    Type: z.nativeEnum(BackgroundType),
    Value: z.string().min(1, 'Background value is required'),
    GradientStartColour: z.string().optional(),
    GradientEndColour: z.string().optional(),
    GradientDirection: z.string().optional(),
    Overlay: z.object({
      Colour: z.string().optional(),
      Opacity: z.preprocess(preprocessNumber, z.number().min(0).max(1)).optional()
    }).optional()
  })),
  TextColour: z.nativeEnum(TextColour),
  LayoutStyle: z.nativeEnum(LayoutStyle),
}).refine(
  (data) => data.MediaType !== MediaType.YOUTUBE || !!data.YouTubeUrl,
  {
    message: 'YouTube URL is required when media type is YouTube',
    path: ['YouTubeUrl']
  }
);

const PreUploadBannerSchemaWithRefinements = applySharedRefinements(
  BannerPreUploadApiSchema,
  sharedBannerRefinements
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
