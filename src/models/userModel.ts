import { Schema, model } from 'mongoose';
import { IUser } from '@/types/index.js';

const userSchema = new Schema<IUser>({
  DocumentCreationDate: {
    type: Date,
    default: Date.now,
  },
  DocumentModifiedDate: {
    type: Date,
    default: Date.now,
  },
  CreatedBy: {
    type: String,
    required: true,
  },
  UserName: {
    type: String,
    required: true,
  },
  AuthClaims: {
    type: [String],
    default: [],
  },
  Email: {
    type: Buffer,
    required: true,
  },
  AssociatedAreaId: {
    type: String,
    required: true,
  },
  Auth0Id: {
    type: String,
    required: true,
    unique: true,
  },
  AssociatedProviderLocationIds: {
    type: [String],
    default: [],
  },
}, { collection: 'Users', versionKey: false });

const User = model<IUser>('Users', userSchema);

export default User;
