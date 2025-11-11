import mongoose from "mongoose";

export interface ILink {
  Title: string;
  Link: string;
}

export const LinkSchema = new mongoose.Schema<ILink>({
  Title: {
    type: String,
    required: true,
  },
  Link: {
    type: String,
    required: true
  }
}, { _id: false });