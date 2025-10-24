import { Document, Types } from "mongoose";
import { IOpeningTime } from "./IOpeningTime.js";
import { ILocation } from "./ILocation.js";
import { IServiceSubCategory } from "./IServiceSubCategory.js";

export interface IGroupedService extends Document {
  _id: Types.ObjectId;
  DocumentCreationDate: Date;
  DocumentModifiedDate: Date;
  CreatedBy: string;
  IsPublished: boolean;
  ProviderId: string;
  ProviderName?: string;
  CategoryId: string;
  CategoryName?: string;
  CategorySynopsis?: string;
  Info?: string;
  Location: ILocation;
  IsOpen247: boolean;
  OpeningTimes?: IOpeningTime[];
  SubCategories: IServiceSubCategory[];
  SubCategoryIds?: string[];
  IsTelephoneService?: boolean;
  IsAppointmentOnly?: boolean;
  Telephone?: string;
}