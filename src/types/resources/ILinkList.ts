import mongoose from "mongoose";
import { IKeyValue, KeyValueSchema } from "./IKeyValue.js";

// Accommodation Type Enum
export enum LinkListType {
  LINK = 'link',
  CARD_LINK = 'card-link',
  PDF_LINK = 'pdf-link'
}

export interface ILinkList {
  Name: string;
  Description: string;
  Type: LinkListType;
  Priority: number;
  Links: IKeyValue[];
}

export const LinkListSchema = new mongoose.Schema<ILinkList>({
  Name: {
    type: String,
    required: true,
  },
  Description: {
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
    type: [KeyValueSchema],
    required: true
  }
}, { _id: false });