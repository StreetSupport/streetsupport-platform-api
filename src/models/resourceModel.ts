import { Schema, model } from 'mongoose';
import { IResource } from '../types/resources/IResource.js';
import { LinkListSchema } from '../types/resources/ILinkList.js';

const resourceSchema = new Schema<IResource>({
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
  // Resource key: alternative-giving, effective-volunteering, charters, street-feeding-groups, branding, partnership-comms, marketing, user-guides
  Key: {
    type: String,
    required: true,
    index: true,
    unique: true
  },
  // Resource name: Alternative Giving, Effective Volunteering, Homelessness Charters, Street Feeding, Branding, Partnership Communications, Marketing, User Guides
  Name: {
    type: String,
    required: true,
  },
  // Resource header: Alternative Giving Funds, Effective Volunteering, Homelessness Charters, Street Feeding Groups, Street Support Branding, Partnership Communications, Marketing, User Guides
  Header: {
    type: String,
    required: true,
  },
  // Resource description: 
  // What it means to give differently, and why you should be thinking about it.
  // How to make the most impact with your volunteering.
  // Our stance on Street Feeding for sustainable support and change.
  // Guidelines to adapt and align with the Street Support Network identity.
  // How to make the most of being part of Street Support Network.
  // Strategies to raise awareness and engage your community effectively.
  // Essential guides to help you manage, update, and maintain organisation information on Street Support Network. 
  ShortDescription: {
    type: String,
    required: true,
  },
  Body: {
    type: String,
    required: true,
  },
  LinkList: {
    type: [LinkListSchema],
    default: [],
  }
}, { collection: 'Resources', versionKey: false });

// Indexes for efficient querying
resourceSchema.index({ DocumentCreationDate: -1 }); // Index for sorting by creation date
resourceSchema.index({ DocumentModifiedDate: -1 }); // Index for sorting by modification date

const Resource = model<IResource>('Resources', resourceSchema);

export default Resource;
