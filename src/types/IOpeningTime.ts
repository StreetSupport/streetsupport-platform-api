import mongoose from "mongoose";

export interface IOpeningTime {
    StartTime?: number;
    EndTime?: number;
    Day?: number;
}

export const OpeningTimeSchema = new mongoose.Schema<IOpeningTime>({
  StartTime: Number,
  EndTime: Number,
  Day: Number
}, { _id: false });
