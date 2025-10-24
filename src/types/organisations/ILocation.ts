import mongoose, { Document, Types } from "mongoose";
import { LocationCoordinatesSchema, ILocationCoordinates } from "./ILocationCoordinates.js";

/**
 * ILocation interface for service locations
 * 
 * Validation rules:
 * - If IsOutreachLocation is true: Description is required, address fields are optional
 * - If IsOutreachLocation is false/undefined: StreetLine1 and Postcode are required
 */
export interface ILocation {
  IsOutreachLocation?: boolean;
  Description: string; // Required if IsOutreachLocation is true
  StreetLine1: string; // Required if IsOutreachLocation is false/undefined
  StreetLine2?: string;
  StreetLine3?: string;
  StreetLine4?: string;
  City?: string;
  Postcode: string; // Required if IsOutreachLocation is false/undefined
  Location?: ILocationCoordinates; // Auto-initialized from Postcode using initializeLocationFromPostcode() utility
}

export const LocationSchema = new mongoose.Schema<ILocation>({
  // We have it in the DB but we don't use it.
  IsOutreachLocation: {
    type: Boolean,
    required: false,
  },
  // We have it in the DB but we don't use it. It's related to IsOutreachLocation.
  Description: {
    type: String,
    required: false,
  },
  StreetLine1: {
    type: String,
    required: false,
  },
  StreetLine2: {
    type: String,
    required: false,
  },
  StreetLine3: {
    type: String,
    required: false,
  },
  StreetLine4: {
    type: String,
    required: false,
  },
  City: {
    type: String,
    required: false,
  },
  Postcode: {
    type: String,
    required: false,
  },
  Location: LocationCoordinatesSchema
}, { _id: false });