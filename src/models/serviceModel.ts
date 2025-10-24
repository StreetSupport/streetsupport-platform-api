import mongoose, { model, Schema } from "mongoose";
import { OpeningTimeSchema, AddressSchema, IService, IOpeningTime, IAddress, LocationCoordinatesSchema } from "../types/index.js";

// Organisation-specific Address Schema with required Street and Postcode
const ServiceAddressSchema = new mongoose.Schema<IAddress>({
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
  IsOpen247: Boolean,
  IsAppointmentOnly: Boolean,
  Location: LocationCoordinatesSchema,
  OpeningTimes: {
    type: [OpeningTimeSchema],
    default: [],
    required: false
  }
}, { _id: false });

const serviceSchema = new Schema<IService>({
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
  ParentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  IsPublished: {
    type: Boolean,
    required: true,
  },
  ServiceProviderKey: {
    type: String,
    required: true,
  },
  ServiceProviderName: {
    type: String,
    required: false,
  },
  ParentCategoryKey: {
    type: String,
    required: true,
  },
  SubCategoryKey: {
    type: String,
    required: true,
  },
  SubCategoryName: {
    type: String,
    required: false,
  },
  Info: String,
  OpeningTimes: {
    type: [OpeningTimeSchema],
    default: [],
    required: false
  },
  Address: {
    type: ServiceAddressSchema,
    required: false
  },
  LocationDescription: {
    type: String,
    required: false
  },
  IsTelephoneService: {
    type: Boolean,
    required: false,
  },
  IsAppointmentOnly: {
    type: Boolean,
    required: false,
  }
}, { collection: 'ProvidedServices', versionKey: false });

// Indexes for performance based on database structure
// Note: _id index is created automatically by MongoDB, no need to define it explicitly
serviceSchema.index({ ServiceProviderKey: 1 });
serviceSchema.index({ ParentId: 1 });
serviceSchema.index({ 'Address.Location': '2dsphere' });

const Service = model<IService>("ProvidedServices", serviceSchema);

export default Service;
