import mongoose from "mongoose";

export interface ILink {
  Title: string;
  Link: string;
  Description?: string;
  Header?: string;
  FileType?: string;
}

export const LinkSchema = new mongoose.Schema<ILink>({
  Title: {
    type: String,
    required: true,
  },
  Description: {
    type: String,
    required: false
  },
  Header: {
    type: String,
    required: false
  },
  Link: {
    type: String,
    required: true
  },
  FileType: {
    type: String,
    required: false
  }
}, { _id: false });