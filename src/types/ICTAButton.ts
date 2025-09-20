import { Schema } from "mongoose";

export interface ICTAButton {
  Label: string;
  Url: string;
  Variant?: CTAVariant;
  External?: boolean;
  TrackingContext?: string;
}

export enum CTAVariant {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  OUTLINE = 'outline'
}

export const CTAButtonSchema = new Schema<ICTAButton>({
  Label: { type: String, required: true, maxlength: 50 },
  Url: { type: String, required: true },
  Variant: { 
    type: String, 
    enum: Object.values(CTAVariant), 
    default: CTAVariant.PRIMARY 
  },
  External: { type: Boolean, default: false },
  TrackingContext: { type: String }
}, { _id: false });
