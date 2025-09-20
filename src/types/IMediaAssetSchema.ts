import { Schema } from "mongoose";

export interface IMediaAsset {
  Url: string;
  Alt: string;
  Width?: number;
  Height?: number;
  Filename?: string;
  Size?: number;
  MimeType?: string;
}

export const MediaAssetSchema = new Schema<IMediaAsset>({
  Url: { type: String, required: true },
  Alt: { type: String, required: true },
  Width: { type: Number },
  Height: { type: Number },
  Filename: { type: String },
  Size: { type: Number },
  MimeType: { type: String }
}, { _id: false });