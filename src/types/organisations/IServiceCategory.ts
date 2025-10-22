import mongoose from "mongoose";
import { IServiceSubCategory } from "./IServiceSubCategory.js";

export interface IServiceCategory {
  _id: string;
  Name: string;
  Synopsis: string;
  SubCategories: IServiceSubCategory[];
}