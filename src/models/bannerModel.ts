import { 
  BannerTemplateType, 
  CharterType, 
  IBanner, 
  LayoutStyle, 
  TextColour, 
  UrgencyLevel,
  BannerBackgroundSchema,
  CTAButtonSchema,
  DonationGoalSchema,
  MediaAssetSchema,
  ResourceFileSchema
} from "../types/index.js";
import mongoose, { Schema } from 'mongoose';

// Template-specific nested schemas
const GivingCampaignSchema = new Schema({
  UrgencyLevel: { type: String, enum: Object.values(UrgencyLevel), required: true },
  CampaignEndDate: { type: Date },
  DonationGoal: DonationGoalSchema
}, { _id: false });

const PartnershipCharterSchema = new Schema({
  PartnerLogos: [MediaAssetSchema],
  CharterType: { type: String, enum: Object.values(CharterType) },
  SignatoriesCount: { type: Number, min: 0 }
}, { _id: false });

const ResourceProjectSchema = new Schema({
  ResourceFile: ResourceFileSchema
}, { _id: false });

// Main Banner Schema
export const BannerSchema = new Schema({
  DocumentCreationDate: {
    type: Date,
    default: Date.now,
  },
  DocumentModifiedDate: {
    type: Date,
    default: Date.now,
  },
  CreatedBy: {
    type: String,
    required: true,
  },

  // Core content
  Title: { type: String, required: true, maxlength: 50 },
  Description: { type: String, maxlength: 200 },
  Subtitle: { type: String, maxlength: 50 },
  
  // Template type
  TemplateType: { 
    type: String, 
    enum: Object.values(BannerTemplateType), 
    required: true 
  },
  
  // Media
  Logo: MediaAssetSchema,
  BackgroundImage: MediaAssetSchema,
  MainImage: MediaAssetSchema, // Separate image for split layout (not background)

  // Actions
  CtaButtons: {
    type: [CTAButtonSchema],
    required: false,
    validate: {
      validator: function(buttons: any[]) {
        return !buttons || (buttons.length >= 0 && buttons.length <= 3);
      },
      message: 'Must have not more than 3 CTA buttons'
    }
  },
  
  // Styling
  Background: { type: BannerBackgroundSchema, required: true },
  TextColour: { type: String, enum: Object.values(TextColour), required: true },
  LayoutStyle: { type: String, enum: Object.values(LayoutStyle), required: true },

  // Optional features
  ShowDates: { type: Boolean, default: false },
  StartDate: { type: Date },
  EndDate: { type: Date },
  BadgeText: { type: String, maxlength: 50 },
  
  // Template-specific fields - using nested objects
  GivingCampaign: GivingCampaignSchema,
  PartnershipCharter: PartnershipCharterSchema,
  ResourceProject: ResourceProjectSchema,
  
  // CMS metadata
  IsActive: { type: Boolean, default: true },
  LocationSlug: { type: String, required: true },
  LocationName: { type: String, required: true },
  Priority: { type: Number, min: 1, max: 10, default: 5 },
  
  // Analytics
  TrackingContext: { type: String },
  AnalyticsId: { type: String }
}, {
  collection: 'Banners', 
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
BannerSchema.index({ IsActive: 1, Priority: -1, 'DocumentCreationDate': -1 });
BannerSchema.index({ LocationSlug: 1, IsActive: 1 });
BannerSchema.index({ TemplateType: 1, IsActive: 1 });
BannerSchema.index({ CreatedBy: 1 });

// Instance methods
BannerSchema.methods.IncrementDownloadCount = function() {
  if (this.TemplateType === BannerTemplateType.RESOURCE_PROJECT && this.ResourceProject?.ResourceFile) {
    this.ResourceProject.ResourceFile.DownloadCount = (this.ResourceProject.ResourceFile.DownloadCount || 0) + 1;
    return this.save();
  }
};

// Create and export the model
export const Banner = mongoose.model<IBanner>('Banners', BannerSchema);

export default Banner;
