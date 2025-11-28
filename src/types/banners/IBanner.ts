import { Document, Types } from "mongoose";
import { IMediaAsset } from "./IMediaAsset.js";
import { IBannerBackground } from "./IBannerBackground.js";
import { ICTAButton } from "./ICTAButton.js";
import { IDonationGoal } from "./IDonationGoal.js";
import { IResourceFile } from "./IResourceFile.js";

// Template-specific interfaces
export interface IGivingCampaign {
  UrgencyLevel: UrgencyLevel;
  CampaignEndDate?: Date;
  DonationGoal?: IDonationGoal;
}

export interface IPartnershipCharter {
  PartnerLogos?: IMediaAsset[];
  CharterType?: CharterType;
  SignatoriesCount?: number;
}

export interface IResourceProject {
  ResourceFile?: IResourceFile;
}

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
  MainImage?: IMediaAsset;
  
  // Actions
  CtaButtons?: ICTAButton[];
  
  // Styling
  Background: IBannerBackground;
  TextColour: TextColour;
  LayoutStyle: LayoutStyle;
  
  // Scheduling
  StartDate?: Date;
  EndDate?: Date;
  BadgeText?: string;
  
  // Template-specific fields - using nested objects for better organization
  GivingCampaign?: IGivingCampaign;
  PartnershipCharter?: IPartnershipCharter;
  ResourceProject?: IResourceProject;
  
  // CMS metadata
  IsActive: boolean;
  LocationSlug: string;
  LocationName?: string;
  Priority: number;
  TrackingContext?: string;
  
  // Methods
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