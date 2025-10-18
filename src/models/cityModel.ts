import mongoose from "mongoose";
import { LocationCoordinatesSchema, ICity } from "../types/index.js";

const citySchema = new mongoose.Schema({
  // _id: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   required: true,
  // },
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
  Name: {
    type: String,
    required: true,
  },
  Key: {
    type: String,
    required: true,
  },
  PostcodeOfCentre: {
    type: String,
    required: true,
  },
  Longitude: {
    type: Number,
    required: true,
  },
  Latitude: {
    type: Number,
    required: true,
  },
  SwepIsAvailable: {
    type: Boolean,
    required: true,
  },
  IsOpenToRegistrations: {
    type: Boolean,
    required: true,
  },
  IsPublic: {
    type: Boolean,
    required: true,
  },
  Location: {
    type: LocationCoordinatesSchema,
    required: true,
    index: '2dsphere'
  },
  ToolkitIsEnabled: Boolean,
  CharterIsEnabled: Boolean,
  BigChangeIsEnabled: Boolean,
  RealChangeIsEnabled: Boolean,
  RealChangeUrl: String,
  RealChangeTitle: String,
  AbenIsEnabled: Boolean,
  HomePageStats: [String],
}, { collection: 'Cities', versionKey: false });

const City = mongoose.model<ICity>("Cities", citySchema);

export default City;
