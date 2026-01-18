import mongoose from "mongoose";
import { IClientGroup } from "../types/IClientGroup.js";

const clientGroupSchema = new mongoose.Schema({
  Key: { type: String, required: true },
  Name: { type: String, required: true },
  SortPosition: { type: Number, required: true },
  DocumentCreationDate: { type: Date, required: false },
  DocumentModifiedDate: { type: Date, required: false },
  CreatedBy: { type: String, required: false }
}, { collection: 'ClientGroups', versionKey: false });

const ClientGroup = mongoose.model<IClientGroup>("ClientGroups", clientGroupSchema);

export default ClientGroup;
