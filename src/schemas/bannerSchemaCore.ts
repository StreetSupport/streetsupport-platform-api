import { z } from 'zod';
import { ValidationResult, createValidationResult } from './validationHelpers.js';
import { 
  BannerTemplateType, 
  TextColour, 
  LayoutStyle, 
  UrgencyLevel, 
  CharterType, 
  ResourceType,
  BackgroundType,
  CTAVariant
} from '../types/index.js';

// Core Media Asset Schema - shared structure
export const MediaAssetSchemaCore = z.object({
  Url: z.string().optional(),
  Alt: z.string().optional(),
  Width: z.number().optional(),
  Height: z.number().optional(),
  Filename: z.string().optional(),
  Size: z.number().positive().optional(),
  MimeType: z.string().optional()
}).nullable().optional();

// Core Banner Background Schema - shared validation rules
export const BannerBackgroundSchemaCore = z.object({
  Type: z.nativeEnum(BackgroundType),
  Value: z.string().min(1, 'Background value is required'),
  Overlay: z.object({
    Colour: z.string().optional(),
    Opacity: z.number().min(0).max(1).optional()
  }).optional()
});

// Core CTA Button Schema - shared validation rules
export const CTAButtonSchemaCore = z.object({
  Label: z.string().min(1, 'Button label is required').max(20, 'Button label must be 20 characters or less'),
  Url: z
    .string()
    .min(1, 'Button URL is required')
    .refine(
      (value) => value.startsWith('/') || z.string().url().safeParse(value).success,
      'URL must be a valid URL or relative path'
    ),
  Variant: z.nativeEnum(CTAVariant).default(CTAVariant.PRIMARY),
  External: z.boolean().optional().default(false)
}).optional();

// Core Donation Goal Schema - shared validation rules
export const DonationGoalSchemaCore = z.object({
  // Base numeric types; conditional strictness is applied via cross-field refinements below
  Target: z.number().min(1, 'Target amount must be non-negative'),
  Current: z.number().min(0, 'Current amount must be non-negative').optional(),
  Currency: z.string().length(3, 'Currency must be a 3-letter code').default('GBP').optional()
}).refine(
  (data) => {
    if (data.Current && data.Target) {
      return data.Current <= data.Target;
    }
    return true;
  },
  { message: 'Current donation amount cannot exceed target', path: ['Current'] }
).optional();

// Core Resource File Schema - shared validation rules
export const ResourceFileSchemaCore = z.object({
  FileUrl: z.string().min(1, 'File URL is required'),
  FileName: z.string().min(1, 'File name is required'),
  ResourceType: z.nativeEnum(ResourceType).default(ResourceType.GUIDE),
  DownloadCount: z.number().min(0).optional().default(0),
  LastUpdated: z.date().default(() => new Date()),
  FileSize: z.string().min(1, 'File size is required').max(20, 'File size must be 20 characters or less'),
  FileType: z.string().min(1, 'File type is required').max(10, 'File type must be 10 characters or less')
});

// Template-specific schemas
export const GivingCampaignSchemaCore = z.object({
  UrgencyLevel: z.nativeEnum(UrgencyLevel),
  CampaignEndDate: z.date().optional(),
  DonationGoal: DonationGoalSchemaCore,
}).optional();

export const PartnershipCharterSchemaCore = z.object({
  PartnerLogos: z.array(MediaAssetSchemaCore).max(5, 'Maximum 5 partner logos allowed').optional(),
  CharterType: z.nativeEnum(CharterType),
  SignatoriesCount: z.number().min(0, 'Signatories count must be non-negative').optional(),
}).optional();

export const ResourceProjectSchemaCore = z.object({
  ResourceFile: ResourceFileSchemaCore.optional(),
}).optional();

// Core Banner Schema - shared structure and validation rules
export const BannerSchemaCore = z.object({
  // Core content
  Title: z.string().min(1, 'Title is required').max(50, 'Title must be 50 characters or less'),
  Description: z.string().max(200, 'Description must be 200 characters or less').optional(),
  Subtitle: z.string().max(50, 'Subtitle must be 50 characters or less').optional(),
  TemplateType: z.nativeEnum(BannerTemplateType),

  // Actions
  CtaButtons: z.array(CTAButtonSchemaCore)
    .max(3, 'Maximum 3 CTA buttons allowed'),

  // Media Assets
  // We initialize these media properties only after uploading to BlobStorage on the API side
  // For new uploaded files we add prefix newfile_ (newfile_Logo, newfile_BackgroundImage, newfile_MainImage, newfile_AccentGraphic, newfile_PartnerLogos, newfile_ResourceFile) to original property name, 
  // and prefix newmetadata_ (newmetadata_AccentGraphic, newmetadata_ResourceFile) to additional metadata. 
  // or existing media assets (not true, because for existing files we add prefix existing_ to original property name) 
  // Fields described above aren't files, they contain information about file.
  // I don't know if we should validate fields with prefixes because they are created automatically for new uploaded files and 
  // taken from database for existing files.
  Logo: MediaAssetSchemaCore,
  BackgroundImage: MediaAssetSchemaCore,
  MainImage: MediaAssetSchemaCore,
  // TODO: Uncomment if AccentGraphic is needed. In the other case, remove.
  // AccentGraphic: AccentGraphicSchemaCore,

  // Styling
  Background: BannerBackgroundSchemaCore,
  TextColour: z.nativeEnum(TextColour),
  LayoutStyle: z.nativeEnum(LayoutStyle),

  // Scheduling
  ShowDates: z.boolean().optional(),
  StartDate: z.date().optional(),
  EndDate: z.date().optional(),
  BadgeText: z.string().max(25, 'Badge text must be 25 characters or less').optional(),

  // Template-specific fields - made optional here, but required by refinements based on TemplateType
  GivingCampaign: GivingCampaignSchemaCore,
  PartnershipCharter: PartnershipCharterSchemaCore,
  ResourceProject: ResourceProjectSchemaCore,

  // CMS metadata
  IsActive: z.boolean().default(true),
  LocationSlug: z.string().min(1, 'Location slug is required'),
  LocationName: z.string().optional(),
  Priority: z.number().min(1).max(10, 'Priority must be between 1 and 10').default(1),
  TrackingContext: z.string().optional(),
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
);

// Strong types for shared refinements and validation utilities
type BannerCore = z.infer<typeof BannerSchemaCore>;
interface RefinementEntry<T> {
  refinement: (data: T) => boolean;
  message: string;
  path: (string | number)[];
}

// Shared cross-field validation refinements
export const sharedBannerRefinements: RefinementEntry<BannerCore>[] = [
];

// Helper function to apply shared refinements to a schema
export function applySharedRefinements<T extends z.ZodTypeAny>(
  schema: T,
  refinements: Array<RefinementEntry<z.infer<T>>> = sharedBannerRefinements as unknown as Array<RefinementEntry<z.infer<T>>>
): T {
  let refinedSchema = schema;
  
  for (const { refinement, message, path } of refinements) {
    refinedSchema = refinedSchema.refine(refinement, { message, path }) as T;
  }
  
  return refinedSchema;
}

export type { ValidationResult };
export { createValidationResult };
export { BannerTemplateType, TextColour, UrgencyLevel, LayoutStyle, CharterType, ResourceType, BackgroundType, CTAVariant };
