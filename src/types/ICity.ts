import { Document, Types } from "mongoose";
import { ILocation } from "./ILocation.js";

export interface ICity extends Document {
  _id: Types.ObjectId;
  DocumentCreationDate: Date;
  DocumentModifiedDate: Date;
  CreatedBy: string;
  Name: string;
  Key: string;
  PostcodeOfCentre: string;
  Longitude: number;
  Latitude: number;
  SwepIsAvailable: boolean;
  IsOpenToRegistrations: boolean;
  IsPublic: boolean;
  Location: ILocation;
  ToolkitIsEnabled?: boolean;
  CharterIsEnabled?: boolean;
  BigChangeIsEnabled?: boolean;
  RealChangeIsEnabled?: boolean;
  RealChangeUrl?: string;
  RealChangeTitle?: string;
  AbenIsEnabled?: boolean;
  HomePageStats?: string[];
}
