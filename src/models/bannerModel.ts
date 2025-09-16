import mongoose, { Schema, Document } from 'mongoose';

// Enums for type safety
export enum BannerTemplateType {
  GIVING_CAMPAIGN = 'giving-campaign',
  PARTNERSHIP_CHARTER = 'partnership-charter',
  RESOURCE_PROJECT = 'resource-project'
}

export enum BackgroundType {
  SOLID = 'solid',
  GRADIENT = 'gradient',
  IMAGE = 'image'
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

export enum CTAVariant {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  OUTLINE = 'outline'
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

// Sub-schemas
const MediaAssetSchema = new Schema({
  url: { type: String, required: true },
  alt: { type: String, required: true },
  width: { type: Number },
  height: { type: Number },
  filename: { type: String }, // Original filename
  size: { type: Number }, // File size in bytes
  mimeType: { type: String } // MIME type
}, { _id: false });

const VideoAssetSchema = new Schema({
  url: { type: String, required: true },
  title: { type: String, required: true },
  poster: { type: String },
  captions: { type: String },
  filename: { type: String },
  size: { type: Number },
  duration: { type: Number } // Duration in seconds
}, { _id: false });

const AccentGraphicSchema = new Schema({
  url: { type: String, required: true },
  alt: { type: String, required: true },
  position: { 
    type: String, 
    enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'],
    default: 'top-right'
  },
  opacity: { type: Number, min: 0, max: 1, default: 0.6 }
}, { _id: false });

const BannerBackgroundSchema = new Schema({
  type: { type: String, enum: Object.values(BackgroundType), required: true },
  value: { type: String, required: true }, // Hex color, gradient string, or image URL
  overlay: {
    colour: { type: String },
    opacity: { type: Number, min: 0, max: 1 }
  }
}, { _id: false });

const CTAButtonSchema = new Schema({
  label: { type: String, required: true, maxlength: 50 },
  url: { type: String, required: true },
  variant: { type: String, enum: Object.values(CTAVariant), default: CTAVariant.PRIMARY },
  external: { type: Boolean, default: false },
  trackingContext: { type: String }
}, { _id: false });

const DonationGoalSchema = new Schema({
  target: { type: Number, required: true, min: 0 },
  current: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, default: 'GBP', maxlength: 3 }
}, { _id: false });

// Main Banner Schema
const BannerSchema = new Schema({
  // Core content
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, maxlength: 1000 },
  subtitle: { type: String, maxlength: 300 },
  
  // Template type
  templateType: { 
    type: String, 
    enum: Object.values(BannerTemplateType), 
    required: true 
  },
  
  // Media
  logo: MediaAssetSchema,
  image: MediaAssetSchema,
  video: VideoAssetSchema,
  
  // Actions
  ctaButtons: {
    type: [CTAButtonSchema],
    required: true,
    validate: {
      validator: function(buttons: any[]) {
        return buttons && buttons.length > 0 && buttons.length <= 3;
      },
      message: 'Must have between 1 and 3 CTA buttons'
    }
  },
  
  // Styling
  background: { type: BannerBackgroundSchema, required: true },
  textColour: { type: String, enum: Object.values(TextColour), required: true },
  layoutStyle: { type: String, enum: Object.values(LayoutStyle), required: true },
  accentGraphic: AccentGraphicSchema,
  
  // Optional features
  showDates: { type: Boolean, default: false },
  startDate: { type: Date },
  endDate: { type: Date },
  badgeText: { type: String, maxlength: 50 },
  
  // Template-specific fields
  // Giving Campaign
  donationGoal: DonationGoalSchema,
  urgencyLevel: { type: String, enum: Object.values(UrgencyLevel) },
  campaignEndDate: { type: Date },
  
  // Partnership Charter
  partnerLogos: [MediaAssetSchema],
  charterType: { type: String, enum: Object.values(CharterType) },
  signatoriesCount: { type: Number, min: 0 },
  
  // Resource Project
  resourceType: { type: String, enum: Object.values(ResourceType) },
  downloadCount: { type: Number, min: 0, default: 0 },
  lastUpdated: { type: Date },
  fileSize: { type: String },
  fileType: { type: String, maxlength: 10 },
  
  // CMS metadata
  isActive: { type: Boolean, default: true },
  locationSlug: { type: String }, // null means all locations
  priority: { type: Number, min: 1, max: 10, default: 5 },
  
  // Analytics
  trackingContext: { type: String },
  analyticsId: { type: String },
  
  // Audit fields
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  collection: 'Banners', 
  versionKey: false,
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
BannerSchema.index({ isActive: 1, priority: -1, createdAt: -1 });
BannerSchema.index({ locationSlug: 1, isActive: 1 });
BannerSchema.index({ templateType: 1, isActive: 1 });
BannerSchema.index({ createdBy: 1 });

// Virtuals
BannerSchema.virtual('isExpired').get(function() {
  if (!this.endDate) return false;
  return new Date() > this.endDate;
});

BannerSchema.virtual('daysRemaining').get(function() {
  if (!this.endDate) return null;
  const now = new Date();
  const end = new Date(this.endDate);
  const diffTime = end.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware
BannerSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Validate template-specific required fields
  if (this.templateType === BannerTemplateType.GIVING_CAMPAIGN) {
    if (this.donationGoal && this.donationGoal.current > this.donationGoal.target) {
      return next(new Error('Current donation amount cannot exceed target'));
    }
  }
  
  // Validate date ranges
  if (this.startDate && this.endDate && this.startDate >= this.endDate) {
    return next(new Error('End date must be after start date'));
  }
  
  next();
});

// Instance methods
BannerSchema.methods.calculateProgress = function() {
  if (!this.donationGoal) return 0;
  return Math.min(Math.round((this.donationGoal.current / this.donationGoal.target) * 100), 100);
};

BannerSchema.methods.incrementDownloadCount = function() {
  if (this.templateType === BannerTemplateType.RESOURCE_PROJECT) {
    this.downloadCount = (this.downloadCount || 0) + 1;
    return this.save();
  }
};

BannerSchema.methods.toPublicJSON = function() {
  const obj = this.toObject();
  delete obj.createdBy;
  delete obj.updatedBy;
  delete obj.analyticsId;
  return obj;
};

// Static methods
BannerSchema.statics.findActive = function(locationSlug?: string) {
  const query: any = { isActive: true };
  
  if (locationSlug) {
    query.$or = [
      { locationSlug: locationSlug },
      { locationSlug: { $exists: false } },
      { locationSlug: null }
    ];
  }
  
  return this.find(query)
    .sort({ priority: -1, createdAt: -1 })
    .populate('createdBy', 'UserName Email');
};

BannerSchema.statics.findByTemplate = function(templateType: BannerTemplateType) {
  return this.find({ templateType, isActive: true })
    .sort({ priority: -1, createdAt: -1 });
};

// Interface for TypeScript
export interface IBanner extends Document {
  title: string;
  description?: string;
  subtitle?: string;
  templateType: BannerTemplateType;
  logo?: any;
  image?: any;
  video?: any;
  ctaButtons: any[];
  background: any;
  textColour: TextColour;
  layoutStyle: LayoutStyle;
  accentGraphic?: any;
  showDates?: boolean;
  startDate?: Date;
  endDate?: Date;
  badgeText?: string;
  donationGoal?: any;
  urgencyLevel?: UrgencyLevel;
  campaignEndDate?: Date;
  partnerLogos?: any[];
  charterType?: CharterType;
  signatoriesCount?: number;
  resourceType?: ResourceType;
  downloadCount?: number;
  lastUpdated?: Date;
  fileSize?: string;
  fileType?: string;
  isActive: boolean;
  locationSlug?: string;
  priority: number;
  trackingContext?: string;
  analyticsId?: string;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  isExpired: boolean;
  daysRemaining: number | null;
  calculateProgress(): number;
  incrementDownloadCount(): Promise<IBanner>;
  toPublicJSON(): any;
}

export interface IBannerModel extends mongoose.Model<IBanner> {
  findActive(locationSlug?: string): mongoose.Query<IBanner[], IBanner>;
  findByTemplate(templateType: BannerTemplateType): mongoose.Query<IBanner[], IBanner>;
}

export default mongoose.model<IBanner, IBannerModel>('Banners', BannerSchema);
