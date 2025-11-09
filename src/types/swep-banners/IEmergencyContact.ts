import mongoose from "mongoose";

export interface IEmergencyContact {
  Phone: string;
  Email: string;
  Hours: string;
}

export const EmergencyContactSchema = new mongoose.Schema<IEmergencyContact>({
  Phone: {
    type: String,
    required: false,
  },
  Email: {
    type: String,
    required: false,
  },
  Hours: {
    type: String,
    required: false,
  }
}, { _id: false });