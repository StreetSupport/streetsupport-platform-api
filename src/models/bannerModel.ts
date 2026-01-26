import {
  IBanner,
  LayoutStyle,
  MediaType,
  TextColour,
  BannerBackgroundSchema,
  BannerBorderSchema,
  CTAButtonSchema,
  MediaAssetSchema
} from "../types/index.js";
import mongoose, { Schema } from 'mongoose';

const UploadedFileSchema = new Schema({
  FileUrl: { type: String, required: true },
  FileName: { type: String, required: true },
  FileSize: { type: String },
  FileType: { type: String }
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
  Title: { type: String, required: true, maxlength: 100 },
  Description: { type: String, maxlength: 600 },
  Subtitle: { type: String, maxlength: 50 },

  // Media
  MediaType: {
    type: String,
    enum: Object.values(MediaType),
    default: 'image'
  },
  YouTubeUrl: {
    type: String,
    trim: true,
    validate: {
      validator: (v: string) => !v || /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/.test(v),
      message: 'Must be a valid YouTube URL'
    }
  },
  Logo: MediaAssetSchema,
  BackgroundImage: MediaAssetSchema,
  MainImage: MediaAssetSchema,
  UploadedFile: UploadedFileSchema,

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
  Border: { type: BannerBorderSchema },
  TextColour: { type: String, enum: Object.values(TextColour), required: true },
  LayoutStyle: { type: String, enum: Object.values(LayoutStyle), required: true },

  // Scheduling
  StartDate: { type: Date },
  EndDate: { type: Date },

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
BannerSchema.index({ CreatedBy: 1 });

// Create and export the model
export const Banner = mongoose.model<IBanner>('Banners', BannerSchema);

export default Banner;
