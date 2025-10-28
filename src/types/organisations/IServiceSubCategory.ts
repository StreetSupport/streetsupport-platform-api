import mongoose from "mongoose";

export interface IServiceSubCategory {
  _id: string;
  Name: string;
  Synopsis?: string;
}

export const SubCategorySchema = new mongoose.Schema<IServiceSubCategory>({
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
  }
}, { _id: false });