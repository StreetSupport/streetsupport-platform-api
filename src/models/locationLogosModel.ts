import mongoose, { Schema } from "mongoose";
import { ILocationLogo } from "../types/index.js";

const locationLogoSchema = new Schema<ILocationLogo>({
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
  Name: {
    type: String,
    required: true,
  },
  DisplayName: {
    type: String,
    required: true,
  },
  LocationSlug: {
    type: String,
    required: true,
  },
  LocationName: {
    type: String,
    required: true,
  },
  LogoPath: {
    type: String,
    required: true,
  },
  Url: {
    type: String,
    required: true,
  }
}, { collection: 'LocationLogos', versionKey: false });

// Define indexes for better query performance
locationLogoSchema.index({ LocationSlug: 1 }); // For filtering by location
locationLogoSchema.index({ DisplayName: 1 }); // For searching by display name
locationLogoSchema.index({ LocationSlug: 1, DisplayName: 1 }); // Compound index for combined queries
locationLogoSchema.index({ DocumentModifiedDate: -1 }); // For sorting by modification date

const LocationLogo = mongoose.model<ILocationLogo>("LocationLogos", locationLogoSchema);

export default LocationLogo;
