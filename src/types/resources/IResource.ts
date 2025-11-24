import { Document, Types } from 'mongoose';
import { ILinkList } from './ILinkList.js';

export interface IResource extends Document {
  _id: Types.ObjectId;
  DocumentCreationDate: Date;
  DocumentModifiedDate: Date;
  CreatedBy: string;
  Key: string;
  Name: string;
  Header: string;
  ShortDescription: string;
  // HTML content
  Body: string;
  LinkList: ILinkList[];
}
