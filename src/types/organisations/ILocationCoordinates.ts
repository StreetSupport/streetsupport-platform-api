export interface ILocationCoordinates {
  type: string;
  coordinates: [number, number];
}

import { Schema } from 'mongoose';

export const LocationCoordinatesSchema = new Schema({
  type: {
    type: String,
    enum: ['Point'],
    required: false
  },
  coordinates: {
    type: [Number],
    required: false
  }
}, { _id: false });