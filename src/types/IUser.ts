import { Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  DocumentCreationDate: Date;
  DocumentModifiedDate: Date;
  CreatedBy: string;
  UserName: string;
  AuthClaims: string[];
  Email: {
    type: string;
    data: Buffer;
  };
  Auth0Id: string;
  AssociatedProviderLocationIds: string[];
  IsActive: boolean;
}
