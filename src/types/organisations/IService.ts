import { Document, Types } from "mongoose";
import { IOpeningTime } from "./IOpeningTime.js";
import { IAddress } from "./IAddress.js";

export interface IService extends Document {
  _id: Types.ObjectId;
  DocumentCreationDate: Date;
  DocumentModifiedDate: Date;
  CreatedBy: string;
  ParentId: Types.ObjectId;
  IsPublished: boolean;
  ServiceProviderKey: string;
  ServiceProviderName: string;
  ParentCategoryKey: string;
  SubCategoryKey: string;
  SubCategoryName: string;
  Info?: string;
  Tags?: string[];
  OpeningTimes: IOpeningTime[];
  Address: IAddress;
  LocationDescription?: string;
}