import { Document, Types } from "mongoose";

export interface IFaq extends Document {
  _id: Types.ObjectId;
  DocumentCreationDate: Date;
  DocumentModifiedDate: Date;
  CreatedBy: string;
  LocationKey: string;
  Title: string;
  Body: string;
  SortPosition: number;
}