import { Schema, model } from 'mongoose';
import { IUser } from '@/types/index.js';

const archivedUserSchema = new Schema<IUser>({
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
    required: false,
  },
  AuthClaims: {
    type: [String],
    default: [],
  },
  Email: {
    type: Buffer,
    required: true,
  },
  Auth0Id: {
    type: String,
    required: true,
  },
  AssociatedProviderLocationIds: {
    type: [String],
    default: [],
  },
}, { collection: 'ArchivedUsers', versionKey: false });

const ArchivedUser = model<IUser>('ArchivedUsers', archivedUserSchema);

export default ArchivedUser;
