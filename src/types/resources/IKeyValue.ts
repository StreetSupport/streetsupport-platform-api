import mongoose from "mongoose";

export interface IKeyValue {
  Key: string;
  Value: string;
}

export const KeyValueSchema = new mongoose.Schema<IKeyValue>({
  Key: {
    type: String,
    required: true,
  },
  Value: {
    type: String,
    required: true
  }
}, { _id: false });