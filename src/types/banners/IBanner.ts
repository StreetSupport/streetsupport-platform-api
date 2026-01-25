import { Document, Types } from "mongoose";
import { IMediaAsset } from "./IMediaAsset.js";
import { IBannerBackground } from "./IBannerBackground.js";
import { ICTAButton } from "./ICTAButton.js";

export interface IUploadedFile {
  FileUrl: string;
  FileName: string;
  FileSize?: string;
  FileType?: string;
}

export interface IBanner extends Document {
  // Audit fields
  _id: Types.ObjectId;
  DocumentCreationDate: Date;
  DocumentModifiedDate: Date;
  CreatedBy: string;

  // Core content
  Title: string;
  Description?: string;
  Subtitle?: string;

  // Media
  MediaType: MediaType;
  YouTubeUrl?: string;
  Logo?: IMediaAsset;
  BackgroundImage?: IMediaAsset;
  MainImage?: IMediaAsset;
  UploadedFile?: IUploadedFile;

  // Actions
  CtaButtons?: ICTAButton[];

  // Styling
  Background: IBannerBackground;
  TextColour: TextColour;
  LayoutStyle: LayoutStyle;

  // Scheduling
  StartDate?: Date;
  EndDate?: Date;

  // CMS metadata
  IsActive: boolean;
  LocationSlug: string;
  LocationName?: string;
  Priority: number;
  TrackingContext?: string;
}

export enum MediaType {
  IMAGE = 'image',
  YOUTUBE = 'youtube'
}

export enum TextColour {
  BLACK = 'black',
  WHITE = 'white'
}

export enum LayoutStyle {
  SPLIT = 'split',
  FULL_WIDTH = 'full-width'
}