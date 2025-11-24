import mongoose, { Schema } from "mongoose";
import { IFaq } from "../types/index.js";

const faqSchema = new Schema<IFaq>({
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
  }
}, { collection: 'FAQs', versionKey: false });

// Create indexes based on MongoDB Atlas specifications
// faqSchema.index({ _id: 1 }, { unique: true }); // UNIQUE index on _id (default)
faqSchema.index({ LocationKey: 1, SortPosition: -1, Title: 1 }); // COMPOUND index for filtering and sorting

const Faq = mongoose.model<IFaq>("FAQs", faqSchema);

export default Faq;
