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
  // We don't use this property
  AssociatedAreaId: string;
  Auth0Id: string;
  AssociatedProviderLocationIds: string[];
}
