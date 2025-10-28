import mongoose from "mongoose";

export interface INote {
  CreationDate: Date;
  Date: Date;
  StaffName: string;
  Reason: string;
}

export const NoteSchema = new mongoose.Schema<INote>({
  CreationDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  Date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  StaffName: {
    type: String,
    required: true,
    trim: true,
  },
  Reason: {
    type: String,
    required: true,
    trim: true,
  },
}, { _id: false });