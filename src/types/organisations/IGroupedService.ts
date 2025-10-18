import { Document, Types } from "mongoose";
import { IOpeningTime } from "./IOpeningTime.js";
import { ILocation } from "./ILocation.js";
import { ISubCategory } from "./ISubCategory.js";

export interface IGroupedService extends Document {
  _id: Types.ObjectId;
  DocumentCreationDate: Date;
  DocumentModifiedDate: Date;
  CreatedBy: string;
  ProviderId: string;
  ProviderName?: string;
  ProviderAssociatedLocationIds?: string[];
  CategoryId: string;
  CategoryName?: string;
  CategorySynopsis?: string;
  Info?: string;
  Tags?: string[];
  Location: ILocation;
  IsOpen247: boolean;
  OpeningTimes?: IOpeningTime[];
  SubCategories: ISubCategory[];
  SubCategoriesIds?: string[];
  IsTelephoneService?: boolean;
  IsAppointmentOnly?: boolean;
}