import { Document } from "mongoose";

export interface IClientGroup extends Document {
  _id: string;
  Key: string;
  Name: string;
  SortPosition: number;
  DocumentCreationDate?: Date;
  DocumentModifiedDate?: Date;
  CreatedBy?: string;
}
