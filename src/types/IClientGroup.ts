import { Document, Types } from "mongoose";

export interface IClientGroup extends Document {
  _id: Types.ObjectId;
  Key: string;
  Name: string;
  SortPosition: number;
  DocumentCreationDate?: Date;
  DocumentModifiedDate?: Date;
  CreatedBy?: string;
}
