import { Document, Types } from "mongoose";
import { IEmergencyContact } from "./IEmergencyContact.js";

export interface ISwepBanner extends Document {
  // System fields
  _id: Types.ObjectId;
  DocumentCreationDate: Date;
  DocumentModifiedDate: Date;
  CreatedBy: string;

  // Core fields
  LocationSlug: string;
  LocationName: string;
  Title: string;
  Body: string; // HTML content
  Image?: string; // Blob storage URL - required in database
  ShortMessage: string;
  
  // Date fields
  SwepActiveFrom?: Date;
  SwepActiveUntil?: Date;
  IsActive: boolean;
  
  // Emergency contact
  EmergencyContact: IEmergencyContact;
}
