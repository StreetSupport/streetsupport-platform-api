import mongoose, { Schema } from "mongoose";
import { IFaq } from "@/types/index.js";

const faqSchema = new Schema<IFaq>({
  _id: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  DocumentCreationDate: {
    type: Date,
    default: Date.now,
  },
  DocumentModifiedDate: {
    type: Date,
    default: Date.now,
  },
  CreatedBy: {
    type: String,
    required: true,
  },
  LocationKey: {
    type: String,
    required: true,
  },
  Title: {
    type: String,
    required: true,
  },
  Body: {
    type: String,
    required: true,
  },
  SortPosition: {
    type: Number,
    required: true,
  },
  Tags: [String]
}, { collection: 'FAQs', versionKey: false });

const Faq = mongoose.model<IFaq>("FAQs", faqSchema);

export default Faq;
