import mongoose, { Schema } from "mongoose";
import { AddressSchema, AdministratorSchema, IServiceProvider, NoteSchema } from "../types/index.js";
import { truncateSync } from "fs";

const serviceProviderSchema = new Schema<IServiceProvider>({
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
  CreatedBy: String,
  Key: {
    type: String,
    required: true,
  },
  AssociatedLocationIds: {
    type: [String],
    validate: {
      validator: function(v: string[]) {
        return v.length > 0;
      },
      message: 'At least one associated location is required'
    }
  },
  Name: {
    type: String,
    required: true,
  },
  ShortDescription: {
    type: String,
    required: true,
    maxlength: 50,
  },
  Description: {
    type: String,
    required: true,
  },
  IsVerified: {
    type: Boolean,
    required: true
  },
  IsPublished: {
    type: Boolean,
    required: true
  },
  RegisteredCharity: {
    type: Number,
    required: false,
  },
  Tags: {
    type: String,
    required: false,
  },
  Email: {
    type: String,
    required: false,
  },
  Telephone: {
    type: String,
    required: false,
  },
  Website: {
    type: String,
    required: false,
  },
  Facebook: {
    type: String,
    required: false,
  },
  Twitter: {
    type: String,
    required: false,
  },
  Addresses: [AddressSchema],
  Notes: {
    type: [NoteSchema],
    default: [],
    required: false,
  },
  // Administrators: {
  //   type: [AdministratorSchema],
  //   default: [],
  //   required: false,
  //   // required: [true, 'At least one administrator is required'],
  //   // validate: {
  //   //   validator: (v: string[]) => Array.isArray(v) && v.length > 0,
  //   //   message: 'At least one administrator is required'
  //   // }
  // }
}, { collection: 'ServiceProviders', versionKey: false });

// Pre-save middleware
serviceProviderSchema.pre('save', function(next) {
  this.DocumentModifiedDate = new Date();

  next();
});

// Indexes for performance based on database structure
// Note: _id index is created automatically by MongoDB, no need to define it explicitly
serviceProviderSchema.index({ Name: 1 });
serviceProviderSchema.index({ IsPublished: 1, AssociatedLocationIds: 1 });
serviceProviderSchema.index({ Key: 1 });
serviceProviderSchema.index({ AssociatedLocationIds: 1, Name: 1 });
serviceProviderSchema.index({ IsPublished: 1, DocumentCreationDate: -1 });
serviceProviderSchema.index({ AssociatedCityId: 1 });
serviceProviderSchema.index({ IsPublished: 1 });
serviceProviderSchema.index({ IsPublished: 1, AssociatedCityId: 1 });

const ServiceProvider = mongoose.model<IServiceProvider>("ServiceProviders", serviceProviderSchema);

export default ServiceProvider;
