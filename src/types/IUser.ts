import { Document } from 'mongoose';

export interface IUser extends Document {
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
