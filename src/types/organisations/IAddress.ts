import mongoose, { Document, Types } from "mongoose";
import { LocationCoordinatesSchema, ILocationCoordinates } from "./ILocationCoordinates.js";
import { IOpeningTime, OpeningTimeSchema } from "./IOpeningTime.js";

export interface IAddress {
  Primary?: boolean;
  Key: string;
  Street: string;
  Street1?: string;
  Street2?: string;
  Street3?: string;
  City?: string;
  Postcode: string;
  Telephone?: string;
  IsOpen247?: boolean;
  IsAppointmentOnly?: boolean;
  Location?: ILocationCoordinates;
  OpeningTimes: IOpeningTime[];
}

export const AddressSchema = new mongoose.Schema<IAddress>({
  Primary: {
    type: Boolean,
    required: false,
  },
  Key: {
    type: String,
    required: true,
  },
  Street: {
    type: String,
    required: true,
  },
  Street1: String,
  Street2: String,
  Street3: String,
  City: String,
  Postcode: {
    type: String,
    required: true,
  },
  Telephone: String,
  IsOpen247: Boolean,
  IsAppointmentOnly: Boolean,
  Location: LocationCoordinatesSchema,
  OpeningTimes: {
    type: [OpeningTimeSchema],
    default: [],
    required: false
  }
}, { _id: false });