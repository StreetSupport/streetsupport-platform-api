import mongoose, { Document, Types } from "mongoose";
import { LocationSchema, ILocation } from "./ILocation.js";
import { IOpeningTime, OpeningTimeSchema } from "./IOpeningTime.js";

export interface IAddress extends Document {
  Primary: boolean;
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
  Location?: ILocation;
  OpeningTimes: IOpeningTime[];
}

export const AddressSchema = new mongoose.Schema<IAddress>({
  Primary: {
    type: Boolean,
    required: true,
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
  Location: LocationSchema,
  OpeningTimes: {
    type: [OpeningTimeSchema],
    default: [],
    required: false,
    // validate: {
    //   validator: function(v: IOpeningTime[]) {
    //     return v.length > 0;
    //   },
    //   message: 'At least one opening time is required'
    // }
  }
}, { _id: false });