import { Schema } from "mongoose";

export interface ISubCategory {
  Key: string;
  Name: string;
  Synopsis?: string;
}

export const SubCategorySchema = new Schema<ISubCategory>({
  Key: {
    type: String,
    required: true
  },
  Name: {
    type: String,
    required: true
  },
  Synopsis: String
}, { _id: false });
