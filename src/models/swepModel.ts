import { Schema, model } from 'mongoose';
import { ISwepBanner } from '../types/swep-banners/ISwepBanner.js';
import { EmergencyContactSchema } from 'types/swep-banners/IEmergencyContact.js';

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
  locationSlug: {
    type: String,
    required: true,
    index: true,
    unique: true
  },
  locationName: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  shortMessage: {
    type: String,
    required: true
  },

  // Date fields
  swepActiveFrom: {
    type: Date,
    required: false
  },
  swepActiveUntil: {
    type: Date,
    required: false
  },
  isActive: {
    type: Boolean,
    default: false,
    required: true
  },

  // Emergency contact
  emergencyContact: {
    type: EmergencyContactSchema,
    required: false
  }
}, {
  collection: 'SwepBanners',
  versionKey: false
});

// Indexes for performance
SwepBannerSchema.index({ locationSlug: 1, isActive: 1 });
SwepBannerSchema.index({ isActive: 1 });
SwepBannerSchema.index({ swepActiveFrom: 1, swepActiveUntil: 1 });

// Create and export the model
export const SwepBanner = model<ISwepBanner>('SwepBanner', SwepBannerSchema);

export default SwepBanner;