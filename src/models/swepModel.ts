import { Schema, model } from 'mongoose';
import { ISwepBanner } from '../types/swep-banners/ISwepBanner.js';
import { EmergencyContactSchema } from '../types/swep-banners/IEmergencyContact.js';

// SWEP Banner Schema
export const SwepBannerSchema = new Schema<ISwepBanner>({
  // System fields
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
    required: false,
  },

  // Core fields
  LocationSlug: {
    type: String,
    required: true,
    index: true,
    unique: true
  },
  LocationName: {
    type: String,
    required: true
  },
  Title: {
    type: String,
    required: true
  },
  Body: {
    type: String,
    required: true
  },
  Image: {
    type: String,
    required: false
  },
  ShortMessage: {
    type: String,
    required: true
  },

  // Date fields
  SwepActiveFrom: {
    type: Date,
    required: false
  },
  SwepActiveUntil: {
    type: Date,
    required: false
  },
  IsActive: {
    type: Boolean,
    default: false,
    required: true
  },

  // Emergency contact
  EmergencyContact: {
    type: EmergencyContactSchema,
    required: false
  }
}, {
  collection: 'SwepBanners',
  versionKey: false
});

// Indexes for performance
SwepBannerSchema.index({ LocationSlug: 1, IsActive: 1 });
SwepBannerSchema.index({ IsActive: 1 });
SwepBannerSchema.index({ SwepActiveFrom: 1, SwepActiveUntil: 1 });

// Create and export the model
export const SwepBanner = model<ISwepBanner>('SwepBanner', SwepBannerSchema);

export default SwepBanner;