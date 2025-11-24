import mongoose from "mongoose";

export interface ICategorySubCategory {
  Key: string;
  Name: string;
  Synopsis?: string;
}

export interface IServiceCategory {
  _id: string;
  Name: string;
  Synopsis: string;
  SubCategories: ICategorySubCategory[];
}

// CategorySubCategorySchema
export const CategorySubCategorySchema = new mongoose.Schema<ICategorySubCategory>({
  Key: {
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
  }
}, { _id: false });
