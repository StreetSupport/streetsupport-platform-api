import mongoose, { Document, Types } from "mongoose";
import { IMediaAsset } from "./IMediaAssetSchema.js";
import { IAccentGraphic } from "./IAccentGraphic.js";
import { IBannerBackground } from "./IBannerBackground.js";
import { ICTAButton } from "./ICTAButton.js";
import { IDonationGoal } from "./IDonationGoal.js";
import { IResourceFile } from "./IResourceFile.js";

export interface IBanner extends Document {
  // Audit fields
  _id: Types.ObjectId;
  DocumentCreationDate: Date;
  DocumentModifiedDate: Date;
  CreatedBy: string;

  // Core content
  Title: string;
  Description?: string;
  Subtitle?: string;
  TemplateType: BannerTemplateType;
  
  // Media
  Logo?: IMediaAsset;
  BackgroundImage?: IMediaAsset;
  SplitImage?: IMediaAsset; // Separate image for split layout (not background)
  
  // Actions
  CtaButtons: ICTAButton[];
  
  // Styling
  Background: IBannerBackground;
  TextColour: TextColour;
  LayoutStyle: LayoutStyle;
  AccentGraphic?: IAccentGraphic;
  
  // Scheduling
  ShowDates?: boolean;
  StartDate?: Date;
  EndDate?: Date;
  BadgeText?: string;
  
  // Template-specific fields
  // Giving Campaign
  UrgencyLevel?: UrgencyLevel;
  CampaignEndDate?: Date;
  DonationGoal?: IDonationGoal;
  
  // Partnership Charter
  PartnerLogos?: IMediaAsset[];
  CharterType?: CharterType;
  SignatoriesCount?: number;
  
  // Resource Project
  ResourceFile?: IResourceFile;
  
  // CMS metadata
  IsActive: boolean;
  LocationSlug?: string;
  Priority: number;
  
  // Analytics
  TrackingContext?: string;
  AnalyticsId?: string;
  
  // Virtuals
  IsExpired: boolean;
  DaysRemaining: number | null;
  
  // Methods
  CalculateProgress(): number;
  IncrementDownloadCount(): Promise<IBanner>;
}

// Enums for type safety
export enum BannerTemplateType {
  GIVING_CAMPAIGN = 'giving-campaign',
  PARTNERSHIP_CHARTER = 'partnership-charter',
  RESOURCE_PROJECT = 'resource-project'
}

export enum TextColour {
  BLACK = 'black',
  WHITE = 'white'
}

export enum LayoutStyle {
  SPLIT = 'split',
  FULL_WIDTH = 'full-width',
  CARD = 'card'
}

export enum UrgencyLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum CharterType {
  HOMELESS_CHARTER = 'homeless-charter',
  REAL_CHANGE = 'real-change',
  ALTERNATIVE_GIVING = 'alternative-giving',
  PARTNERSHIP = 'partnership'
}

export enum ResourceType {
  GUIDE = 'guide',
  TOOLKIT = 'toolkit',
  RESEARCH = 'research',
  TRAINING = 'training',
  EVENT = 'event'
}

export interface IBannerModel extends mongoose.Model<IBanner> {
  findActive(locationSlug?: string): mongoose.Query<IBanner[], IBanner>;
  findByTemplate(templateType: BannerTemplateType): mongoose.Query<IBanner[], IBanner>;
}