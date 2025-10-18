import mongoose from "mongoose";

export interface ISubCategory {
  _id: string;
  Name: string;
}

export const SubCategorySchema = new mongoose.Schema<ISubCategory>({
  _id: {
    type: String,
    required: true,
  },
  Name: {
    type: String,
    required: true
  }
}, { _id: false });