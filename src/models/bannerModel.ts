import { 
  BannerTemplateType, 
  CharterType, 
  IBanner, 
  IBannerModel, 
  LayoutStyle, 
  TextColour, 
  UrgencyLevel,
  AccentGraphicSchema,
  BannerBackgroundSchema,
  CTAButtonSchema,
  DonationGoalSchema,
  MediaAssetSchema,
  ResourceFileSchema
} from "@/types/index.js";
import mongoose, { Schema } from 'mongoose';

// Template-specific nested schemas
const GivingCampaignSchema = new Schema({
  UrgencyLevel: { type: String, enum: Object.values(UrgencyLevel) },
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
  _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
  },
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
  Title: { type: String, required: true, maxlength: 200 },
  Description: { type: String, maxlength: 1000 },
  Subtitle: { type: String, maxlength: 300 },
  
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
  AccentGraphic: AccentGraphicSchema,

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
// TODO: We will handle synching later for all collections
BannerSchema.index({ IsActive: 1, Priority: -1, 'DocumentCreationDate': -1 });
BannerSchema.index({ LocationSlug: 1, IsActive: 1 });
BannerSchema.index({ TemplateType: 1, IsActive: 1 });
BannerSchema.index({ CreatedBy: 1 });

// Virtuals
BannerSchema.virtual('IsExpired').get(function() {
  if (!this.EndDate) return false;
  return new Date() > this.EndDate;
});

BannerSchema.virtual('DaysRemaining').get(function() {
  if (!this.EndDate) return null;
  const now = new Date();
  const end = new Date(this.EndDate);
  const diffTime = end.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware
BannerSchema.pre('save', function(next) {
  this.DocumentModifiedDate = new Date();

  next();
});

// Instance methods
BannerSchema.methods.CalculateProgress = function() {
  if (!this.GivingCampaign?.DonationGoal) return 0;
  return Math.min(Math.round((this.GivingCampaign.DonationGoal.Current / this.GivingCampaign.DonationGoal.Target) * 100), 100);
};

BannerSchema.methods.IncrementDownloadCount = function() {
  if (this.TemplateType === BannerTemplateType.RESOURCE_PROJECT && this.ResourceProject?.ResourceFile) {
    this.ResourceProject.ResourceFile.DownloadCount = (this.ResourceProject.ResourceFile.DownloadCount || 0) + 1;
    return this.save();
  }
};

// Static methods
BannerSchema.statics.findActive = function(locationSlug?: string) {
  const query: any = { IsActive: true };
  
  if (locationSlug) {
    query.$or = [
      { LocationSlug: locationSlug },
      { LocationSlug: { $exists: false } },
      { LocationSlug: null }
    ];
  }
  
  return this.find(query)
    .sort({ Priority: -1, DocumentCreationDate: -1 })
    .populate('CreatedBy', 'UserName Email');
};

BannerSchema.statics.findByTemplate = function(templateType: BannerTemplateType) {
return this.find({ TemplateType: templateType, IsActive: true })
  .sort({ Priority: -1, DocumentCreationDate: -1 });
};

// Create and export the model
export const Banner = mongoose.model<IBanner, IBannerModel>('Banners', BannerSchema);

export default Banner;
