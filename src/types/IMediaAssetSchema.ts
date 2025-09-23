import { Schema } from "mongoose";

export interface IMediaAsset {
  Url?: string;
  Alt?: string;
  Width?: number;
  Height?: number;
  Filename?: string;
  Size?: number;
  MimeType?: string;
}

export const MediaAssetSchema = new Schema<IMediaAsset>({
  Url: { type: String, required: true },
  Alt: { type: String, required: false },
  Width: { type: Number, required: false },
  Height: { type: Number, required: false },
  Filename: { type: String },
  Size: { type: Number },
  MimeType: { type: String }
}, { _id: false });