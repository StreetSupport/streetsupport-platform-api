import mongoose, { Schema, Types } from "mongoose";
import { LocationCoordinatesSchema, ILocationCoordinates } from "./ILocationCoordinates.js";

export interface IServiceAddress {
  Street: string;
  Street1?: string;
  Street2?: string;
  Street3?: string;
  City?: string;
  Postcode: string;
  Telephone?: string;
  IsOpen247?: boolean;
  IsAppointmentOnly?: boolean;
  Location?: ILocationCoordinates; // Auto-initialized from Postcode using initializeLocationFromPostcode() utility
}

// Service-specific Address Schema with not required Street and Postcode, and removed OpeningTimes and IsAppointmentOnly fields
export const ServiceAddressSchema = new Schema<IServiceAddress>({
  // It's required only on frontend. I decided to omit DB validation. We will see if it works in this way.
  Street: {
    type: String,
    required: false,
  },
  Street1: String,
  Street2: String,
  Street3: String,
  City: String,
  // It's required only on frontend. I decided to omit DB validation. We will see if it works in this way.
  Postcode: {
    type: String,
    required: false,
  },
  Telephone: String,
  Location: LocationCoordinatesSchema,
  // We should use it because we don't have an alternative. It was inizialized automatically (in the previous implementation) from Organisation addresses (dropdown "Use existing address"). 
  // When user typed his own address and clicked "Is Open 24/7", it was ignored and didn't saved to the DB.
  // Now we are going to inizialize it when user clicks "Is Open 24/7" (or use existing address) and save to the DB.
  IsOpen247: Boolean,
  // Probably we don't need duplicated OpeningTimes and IsAppointmentOnly fields here. Because they are already presented in the IService and we use these fields.
  // You can find values in the database for Address.OpeningTimes, but it was inizialized automatically (in the previous implementation) from Organisation addresses (dropdown "Use existing address").
  // OpeningTimes: {
  //   type: [OpeningTimeSchema],
  //   default: [],
  //   required: false
  // }
  // IsAppointmentOnly: Boolean,
}, { _id: false });