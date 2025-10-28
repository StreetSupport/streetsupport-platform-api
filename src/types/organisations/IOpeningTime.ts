import mongoose from "mongoose";

export interface IOpeningTime {
    StartTime: number;
    EndTime: number;
    Day: number;
}

export const OpeningTimeSchema = new mongoose.Schema<IOpeningTime>({
  StartTime: {
    type: Number,
    required: true,
  },
  EndTime: {
    type: Number,
    required: true,
  },
  Day: {
    type: Number,
    required: true,
  }
}, { _id: false });