import mongoose from "mongoose";

export interface IEmergencyContact {
  phone: string;
  email: string;
  hours: string;
}

export const EmergencyContactSchema = new mongoose.Schema<IEmergencyContact>({
  phone: {
    type: String,
    required: false,
  },
  email: {
    type: String,
    required: false,
  },
  hours: {
    type: String,
    required: false,
  }
}, { _id: false });