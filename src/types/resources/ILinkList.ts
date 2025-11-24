import mongoose from "mongoose";
import { ILink, LinkSchema } from "./ILink.js";

// Link List Type Enum
export enum LinkListType {
  LINK = 'link',
  CARD_LINK = 'card-link',
  FILE_LINK = 'file-link'
}

export interface ILinkList {
  Name?: string;
  Type: LinkListType;
  Priority: number;
  Links: ILink[];
}

export const LinkListSchema = new mongoose.Schema<ILinkList>({
  Name: {
    type: String,
    required: false,
  },
  Type: {
    type: String,
    required: true,
  },
  Priority: {
    type: Number,
    required: true,
  },
  Links: {
    type: [LinkSchema],
    required: true
  }
}, { _id: false });