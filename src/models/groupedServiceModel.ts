import { model, Schema } from "mongoose";
import { 
  IGroupedService, 
  OpeningTimeSchema, 
  LocationSchema,
  SubCategorySchema 
} from "../types/index.js";

const groupedServiceSchema = new Schema<IGroupedService>({
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
  ProviderId: {
    type: String,
    required: true,
  },
  ProviderName: {
    type: String,
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
  CategoryId: {
    type: String,
    required: true,
  },
  CategoryName: {
    type: String,
    required: false,
  },
  // We have it in the DB but we don't use it.
  CategorySynopsis: {
    type: String,
    required: false,
  },
  Info: {
    type: String,
    required: false,
  },
  Location: {
    type: LocationSchema,
    required: true,
  },
  IsOpen247: {
    type: Boolean,
    required: true,
  },
  OpeningTimes: {
    type: [OpeningTimeSchema],
    required: false,
  },
  SubCategories: {
    type: [SubCategorySchema],
    required: true,
  },
  // I decided to remove this property because it's duplicated and SubCategories already contains ids
  // SubCategoryIds: {
  //   type: [String],
  //   required: true,
  // },
  IsTelephoneService: {
    type: Boolean,
    required: false,
  },
  IsAppointmentOnly: {
    type: Boolean,
    required: false,
  },
  // We have it in the DB but we don't use it.
  Telephone: {
    type: String,
    required: false,
  },
  ClientGroupKeys: {
    type: [String],
    required: false,
  },
  ClientGroups: {
    type: [{
      Key: { type: String, required: true },
      Name: { type: String, required: true },
      SortPosition: { type: Number, required: true }
    }],
    required: false,
  }
}, { collection: 'GroupedProvidedServices', versionKey: false });

// Indexes for performance based on database structure
// Note: _id index is created automatically by MongoDB, no need to define it explicitly

// Compound index: IsPublished_1_ProviderAssociatedLocationIds_1
groupedServiceSchema.index({ IsPublished: 1, ProviderAssociatedLocationIds: 1 });

// Regular index: CategoryId_1
groupedServiceSchema.index({ CategoryId: 1 });

// Geospatial index: Location.Location_2dsphere
groupedServiceSchema.index({ 'Location.Location': '2dsphere' });

// Compound index: IsPublished_1_ProviderCityId_1
groupedServiceSchema.index({ IsPublished: 1, ProviderCityId: 1 });

// Regular index: ProviderId_1
groupedServiceSchema.index({ ProviderId: 1 });

const GroupedService = model<IGroupedService>("GroupedProvidedServices", groupedServiceSchema);

export default GroupedService;
