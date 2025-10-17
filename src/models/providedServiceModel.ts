import mongoose, { Schema } from "mongoose";
import { OpeningTimeSchema, AddressSchema, IProvidedService, IOpeningTime } from "../types/index.js";

const serviceSchema = new Schema<IProvidedService>({
  _id: {
    type: Schema.Types.ObjectId,
    required: true,
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
    required: true,
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
    required: true,
  },
  Info: String,
  Tags: [String],
  OpeningTimes: {
    type: [OpeningTimeSchema],
    validate: {
      validator: function(v: IOpeningTime[]) {
        return v.length > 0;
      },
      message: 'At least one opening time is required'
    }
  },
  Address: AddressSchema,
  LocationDescription: String,
}, { collection: 'ProvidedServices', versionKey: false });

// Indexes for performance based on database structure
// Note: _id index is created automatically by MongoDB, no need to define it explicitly
serviceSchema.index({ ServiceProviderKey: 1 });
serviceSchema.index({ ParentId: 1 });
serviceSchema.index({ 'Address.Location': '2dsphere' });

const Service = mongoose.model<IProvidedService>("ProvidedServices", serviceSchema);

export default Service;
