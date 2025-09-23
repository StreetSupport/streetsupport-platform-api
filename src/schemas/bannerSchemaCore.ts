import { z } from 'zod';
import { 
    BannerTemplateType, 
    TextColour, 
    LayoutStyle, 
    UrgencyLevel, 
    CharterType, 
    ResourceType,
    BackgroundType,
    CTAVariant,
    ACCENT_POSITIONS,
    AccentPosition
  } from '@/types/index.js';

// Core Media Asset Schema - shared structure
export const MediaAssetSchemaCore = z.object({
  Url: z.string().optional(),
  Alt: z.string().optional(),
  Width: z.number().optional(),
  Height: z.number().optional(),
  Filename: z.string().optional(),
  Size: z.number().positive().optional(),
  MimeType: z.string().optional()
}).optional();

// Core Accent Graphic Schema - extends MediaAsset with position and opacity
export const AccentGraphicSchemaCore = z.object({
  Url: z.string().optional(),
  Alt: z.string().optional(),
  Width: z.number().positive().optional(),
  Height: z.number().positive().optional(),
  Filename: z.string().optional(),
  Size: z.number().positive().optional(),
  MimeType: z.string().optional(),
  Position: z.enum(ACCENT_POSITIONS).optional().default('top-left' as AccentPosition),
  Opacity: z.number().min(0).max(1).optional().default(0.6)
}).optional();

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
  Url: z.string().min(1, 'Button URL is required').refine(
    (url) => url.startsWith('/') || /^https?:\/\//.test(url),
    'URL must be a valid URL or relative path'
  ),
  Variant: z.nativeEnum(CTAVariant).default(CTAVariant.PRIMARY),
  External: z.boolean().optional().default(false)
}).optional();

// Core Donation Goal Schema - shared validation rules
export const DonationGoalSchemaCore = z.object({
  // Base numeric types; conditional strictness is applied via cross-field refinements below
  Target: z.number(),
  Current: z.number().min(0, 'Current amount must be non-negative'),
  Currency: z.string().length(3, 'Currency must be a 3-letter code').default('GBP')
}).refine(
  (data) => data.Current <= data.Target,
  { message: 'Current donation amount cannot exceed target', path: ['Current'] }
).optional();

// Core Resource File Schema - shared validation rules
export const ResourceFileSchemaCore = z.object({
  FileUrl: z.string().optional(),
  ResourceType: z.nativeEnum(ResourceType).optional(),
  DownloadCount: z.number().min(0).optional().default(0),
  LastUpdated: z.date().optional().default(() => new Date()),
  FileSize: z.string().max(20, 'File size must be 20 characters or less').optional(),
  FileType: z.string().max(10, 'File type must be 10 characters or less').optional()
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
  LocationSlug: z.string(),
  Priority: z.number().min(1).max(10, 'Priority must be between 1 and 10').default(1),
});

// Shared cross-field validation refinements
export const sharedBannerRefinements = [
  // Date validation: EndDate must be after StartDate
  {
    refinement: (data: any) => {
      if (data.StartDate && data.EndDate) {
        return data.EndDate > data.StartDate;
      }
      return true;
    },
    message: 'End date must be after start date',
    path: ['EndDate']
  },
  // Campaign end date must be in the future for giving campaigns
  {
    refinement: (data: any) => {
      if (data.TemplateType === BannerTemplateType.GIVING_CAMPAIGN && data.GivingCampaign?.CampaignEndDate) {
        return data.GivingCampaign.CampaignEndDate > new Date();
      }
      return true;
    },
    message: 'Campaign end date must be in the future',
    path: ['GivingCampaign', 'CampaignEndDate']
  },
  // Donation target must be positive ONLY for giving campaigns
  {
    refinement: (data: any) => {
      if (data.TemplateType === BannerTemplateType.GIVING_CAMPAIGN) {
        const target = data.GivingCampaign?.DonationGoal?.Target;
        return typeof target === 'number' && target > 0;
      }
      return true;
    },
    message: 'Donation target must be a positive number',
    path: ['GivingCampaign', 'DonationGoal', 'Target']
  },
  // GivingCampaign object and its DonationGoal are required for giving campaigns
  {
    refinement: (data: any) => {
      if (data.TemplateType === BannerTemplateType.GIVING_CAMPAIGN) {
        return data.GivingCampaign && data.GivingCampaign.DonationGoal;
      }
      return true;
    },
    message: 'Giving Campaign details (including a Donation Goal) are required for this banner type',
    path: ['GivingCampaign']
  },
  // PartnershipCharter object and its CharterType are required for partnership charter banners
  {
    refinement: (data: any) => {
      if (data.TemplateType === BannerTemplateType.PARTNERSHIP_CHARTER) {
        return data.PartnershipCharter && data.PartnershipCharter.CharterType;
      }
      return true;
    },
    message: 'Partnership Charter details (including a Charter Type) are required for this banner type',
    path: ['PartnershipCharter']
  },
  // ResourceProject object and its ResourceFile are required for resource project banners
  {
    refinement: (data: any) => {
      if (data.TemplateType === BannerTemplateType.RESOURCE_PROJECT) {
        return data.ResourceProject && data.ResourceProject.ResourceFile;
      }
      return true;
    },
    message: 'Resource Project details (including a Resource File) are required for this banner type',
    path: ['ResourceProject']
  }
];

// Helper function to apply shared refinements to a schema
export function applySharedRefinements<T extends z.ZodType>(schema: T): T {
  let refinedSchema = schema;
  
  for (const { refinement, message, path } of sharedBannerRefinements) {
    refinedSchema = refinedSchema.refine(refinement, { message, path }) as T;
  }
  
  return refinedSchema;
}

// Shared validation function structure
export interface ValidationResult<T> {
  success: boolean;
  errors: Array<{ path: string; message: string; code: string }>;
  data: T | null;
}

// Helper function to create validation result from Zod result
export function createValidationResult<T>(result: any): ValidationResult<T> {
  if (!result.success) {
    const errors = result.error.issues.map((issue: any) => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code
    }));
    
    return {
      success: false,
      errors,
      data: null
    };
  }
  
  return {
    success: true,
    errors: [],
    data: result.data
  };
}

export { BannerTemplateType, TextColour, UrgencyLevel, LayoutStyle, CharterType, ResourceType, BackgroundType, CTAVariant };
