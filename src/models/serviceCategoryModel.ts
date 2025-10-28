import mongoose from "mongoose";
import { CategorySubCategorySchema, IServiceCategory } from "types/organisations/IServiceCategory.js";

const serviceCategorySchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  Name: {
    type: String,
    required: true
  },
  Synopsis: {
    type: String,
    required: false
  },
  SubCategories: {
    type: [CategorySubCategorySchema],
    required: false
  }
}, { collection: 'NestedServiceCategories', versionKey: false });

const ServiceCategory = mongoose.model<IServiceCategory>("NestedServiceCategories", serviceCategorySchema);

export default ServiceCategory;
