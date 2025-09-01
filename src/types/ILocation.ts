export interface ILocation {
  type: string;
  coordinates: [number, number];
}

import { Schema } from 'mongoose';

export const LocationSchema = new Schema({
  type: {
    type: String,
    enum: ['Point'],
    required: true
  },
  coordinates: {
    type: [Number],
    required: true
  }
}, { _id: false });