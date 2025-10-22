import mongoose, { Document, Types } from "mongoose";
import { LocationCoordinatesSchema, ILocationCoordinates } from "./ILocationCoordinates.js";

export interface ILocation {
  Description: string;
  StreetLine1: string;
  StreetLine2?: string;
  StreetLine3?: string;
  StreetLine4?: string;
  City?: string;
  Postcode: string;
  Location?: ILocationCoordinates; // Auto-initialized from Postcode using initializeLocationFromPostcode() utility
}

export const LocationSchema = new mongoose.Schema<ILocation>({
  Description: {
    type: String,
    required: false,
  },
  StreetLine1: {
    type: String,
    required: true,
  },
  StreetLine2: String,
  StreetLine3: String,
  StreetLine4: String,
  City: String,
  Postcode: {
    type: String,
    required: true,
  },
  Location: LocationCoordinatesSchema
}, { _id: false });