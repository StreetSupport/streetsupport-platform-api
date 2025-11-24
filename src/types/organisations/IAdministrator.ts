import mongoose from "mongoose";

export interface IAdministrator {
  IsSelected: boolean;
  Email: string;
}

export const AdministratorSchema = new mongoose.Schema<IAdministrator>({
  IsSelected: {
    type: Boolean,
    default: false,
    required: true,
  },
  Email: {
    type: String,
    required: true
  },
}, { _id: false });