import mongoose from "mongoose";
import { AddressSchema } from "../types/IAddress.js";
import { IServiceProvider } from "../types/IServiceProvider.js";

const serviceProviderSchema = new mongoose.Schema<IServiceProvider>({
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
    CreatedBy: String,
    Key: {
        type: String,
        required: true,
    },
    AssociatedLocationIds: [String],
    Name: {
        type: String,
        required: true,
    },
    ShortDescription: String,
    IsVerified: {
        type: Boolean,
        required: true
    },
    IsPublished: {
        type: Boolean,
        required: true
    },
    RegisteredCharity: Number,
    Description: String,
    AreaServiced: String,
    Tags: String,
    DonationUrl: String,
    DonationDescription: String,
    ItemsDonationUrl: String,
    ItemsDonationDescription: String,
    Email: String,
    Telephone: String,
    Website: String,
    Facebook: String,
    Twitter: String,
    Addresses: [AddressSchema],
    NeedCategories: [{
        type: String,
        required: false
    }]
}, { collection: 'ServiceProviders', versionKey: false });

const ServiceProvider = mongoose.model<IServiceProvider>("ServiceProviders", serviceProviderSchema);

export default ServiceProvider;
