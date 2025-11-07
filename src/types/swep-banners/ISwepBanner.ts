import { Document, Types } from "mongoose";
import { IEmergencyContact } from "./IEmergencyContact.js";

export interface ISwepBanner extends Document {
  // System fields
  _id: Types.ObjectId;
  DocumentCreationDate: Date;
  DocumentModifiedDate: Date;
  CreatedBy: string;

  // Core fields
  locationSlug: string;
  locationName: string;
  title: string;
  body: string; // HTML content
  image: string; // Blob storage URL - required in database
  shortMessage: string;
  
  // Date fields
  swepActiveFrom?: Date;
  swepActiveUntil?: Date;
  isActive: boolean;
  
  // Emergency contact
  emergencyContact: IEmergencyContact;
}
