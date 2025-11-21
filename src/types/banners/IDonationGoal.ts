import { Schema } from "mongoose";

export interface IDonationGoal {
  Target?: number;
  Current?: number;
  Currency?: string;
}

export const DonationGoalSchema = new Schema<IDonationGoal>({
  Target: { type: Number, min: 0 },
  Current: { type: Number, min: 0 },
  Currency: { type: String, default: 'GBP', maxlength: 3 }
}, { _id: false });
