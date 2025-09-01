import { Document } from "mongoose";
import { ISubCategory } from "./ISubCategory.js";

export interface ICategory extends Document {
  _id: string;
  DocumentCreationDate: Date;
  DocumentModifiedDate: Date;
  SortOrder: number;
  Name: string;
  Synopsis?: string;
  SubCategories: ISubCategory[];
}
