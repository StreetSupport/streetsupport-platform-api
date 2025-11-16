import { Document, Types } from "mongoose";

export interface ILocationLogo extends Document {
  _id: Types.ObjectId;
  DocumentCreationDate: Date;
  DocumentModifiedDate: Date;
  CreatedBy: string;
  Name: string;
  DisplayName: string;
  LocationSlug: string;
  LocationName: string;
  LogoPath: string;
  Url: string;
}