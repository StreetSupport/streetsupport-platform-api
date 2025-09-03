import mongoose from "mongoose";
import { OpeningTimeSchema } from "../types/IOpeningTime.js";
import { AddressSchema } from "../types/IAddress.js";
import { IService } from "../types/IService.js";

const serviceSchema = new mongoose.Schema<IService>({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
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
    ParentId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    IsPublished: {
        type: Boolean,
        required: true,
    },
    ServiceProviderKey: {
        type: String,
        required: true,
    },
    ServiceProviderName: {
        type: String,
        required: true,
    },
    ParentCategoryKey: String,
    SubCategoryKey: String,
    SubCategoryName: String,
    Info: String,
    Tags: [String],
    OpeningTimes: [OpeningTimeSchema],
    Address: AddressSchema,
    LocationDescription: String,
}, { collection: 'ProvidedServices', versionKey: false });

const Service = mongoose.model<IService>("ProvidedServices", serviceSchema);

export default Service;
