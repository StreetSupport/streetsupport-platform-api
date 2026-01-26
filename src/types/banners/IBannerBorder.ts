import { Schema } from "mongoose";

export interface IBannerBorder {
  ShowBorder: boolean;
  Colour: string;
}

export const BannerBorderSchema = new Schema<IBannerBorder>({
  ShowBorder: { type: Boolean, default: false },
  Colour: { type: String, default: '#f8c77c' }
}, { _id: false });
