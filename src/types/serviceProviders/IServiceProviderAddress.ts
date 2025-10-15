import mongoose, { Document, Schema, Types } from "mongoose";
import { LocationSchema, ILocation } from "./ILocation.js";
import { IOpeningTime, OpeningTimeSchema } from "./IOpeningTime.js";

export interface IServiceProviderAddress extends Document {
  _id: Types.ObjectId;
  DocumentCreationDate: Date;
  DocumentModifiedDate: Date;
  CreatedBy: string;
  OriginalId: string;
  ServiceProviderKey: string;
  ServiceProviderName: string;
  ServiceProviderSynopsis: string;
  Street1: string;
  Street2?: string;
  Street3?: string;
  Street4?: string;
  City?: string;
  Postcode: string;
  Telephone?: string;
  IsOpen247?: boolean;
  IsAppointmentOnly?: boolean;
  Location?: ILocation;
  OpeningTimes: IOpeningTime[];
}

export const ServiceProviderAddressSchema = new mongoose.Schema<IServiceProviderAddress>({
  _id: { 
    type: Schema.Types.ObjectId, 
    required: true 
  },
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
  OriginalId: {
    type: String,
    required: true,
  },
  ServiceProviderKey: {
    type: String,
    required: true,
  },
  ServiceProviderName: {
    type: String,
    required: true,
  },
  ServiceProviderSynopsis: {
    type: String,
    required: true,
  },
  Street1: {
    type: String,
    required: true,
  },
  Street2: String,
  Street3: String,
  Street4: String,
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
    validate: {
      validator: function(v: IOpeningTime[]) {
        return v.length > 0;
      },
      message: 'At least one opening time is required'
    }
  }
}, { collection: 'ServiceProviderAddresses', versionKey: false });