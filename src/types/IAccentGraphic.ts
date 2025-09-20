import { Schema } from "mongoose";

// Define the valid positions as a const array to use in both type and schema
export const ACCENT_POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'] as const;
export type AccentPosition = typeof ACCENT_POSITIONS[number];

export interface IAccentGraphic {
  url: string;
  alt: string;
  position?: AccentPosition;
  opacity?: number;
}

export const AccentGraphicSchema = new Schema<IAccentGraphic>({
  url: { type: String, required: true },
  alt: { type: String, required: true },
  position: { 
    type: String, 
    enum: ACCENT_POSITIONS,
    default: 'top-right' as const
  },
  opacity: { type: Number, min: 0, max: 1, default: 0.6 }
}, { _id: false });
