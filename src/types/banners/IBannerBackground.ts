import { Schema } from "mongoose";

export interface IBannerBackground {
  Type: BackgroundType;
  Value: string;
  Overlay?: {
    Colour?: string;
    Opacity?: number;
  };
}

export enum BackgroundType {
  SOLID = 'solid',
  GRADIENT = 'gradient',
  IMAGE = 'image'
}

export const BannerBackgroundSchema = new Schema<IBannerBackground>({
  Type: { type: String, enum: Object.values(BackgroundType), required: true },
  Value: { type: String, required: true },
  Overlay: {
    Colour: { type: String },
    Opacity: { type: Number, min: 0, max: 1 }
  }
}, { _id: false });
