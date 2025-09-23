import { Schema } from "mongoose";
import { IMediaAsset } from "./IMediaAssetSchema.js";

// Define the valid positions as a const array to use in both type and schema
export const ACCENT_POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'] as const;
export type AccentPosition = typeof ACCENT_POSITIONS[number];

export interface IAccentGraphic extends IMediaAsset {
  Position?: AccentPosition;
  Opacity?: number;
}

export const AccentGraphicSchema = new Schema<IAccentGraphic>({
  Url: { type: String, required: true },
  Alt: { type: String, required: false },
  Filename: { type: String },
  Size: { type: Number },
  MimeType: { type: String },
  Position: { 
    type: String, 
    enum: ACCENT_POSITIONS,
    default: 'top-right' as const
  },
  Opacity: { type: Number, min: 0, max: 1, default: 0.6 }
}, { _id: false });
