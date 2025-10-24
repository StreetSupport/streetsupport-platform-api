import { model, Schema } from "mongoose";
import { OpeningTimeSchema, IService, ServiceAddressSchema } from "../types/index.js";

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
    type: Schema.Types.ObjectId,
    required: true,
  },
  IsPublished: {
    type: Boolean,
    required: true,
  },
  IsVerified: {
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
  IsTelephoneService: {
    type: Boolean,
    required: false,
  },
  IsAppointmentOnly: {
    type: Boolean,
    required: false,
  },
  // We have it in the DB but we don't use it.
  LocationDescription: {
    type: String,
    required: false
  }
}, { collection: 'ProvidedServices', versionKey: false });

// Indexes for performance based on database structure
// Note: _id index is created automatically by MongoDB, no need to define it explicitly
serviceSchema.index({ ServiceProviderKey: 1 });
serviceSchema.index({ ParentId: 1 });
serviceSchema.index({ 'Address.Location': '2dsphere' });

const Service = model<IService>("ProvidedServices", serviceSchema);

export default Service;
