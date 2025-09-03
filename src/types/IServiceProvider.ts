import { Document, Types } from "mongoose";
import { IAddress } from "./IAddress.js";
import { INeedCategory } from "./INeedCategory.js";

export interface IServiceProvider extends Document {
    _id: Types.ObjectId;
    DocumentCreationDate: Date;
    DocumentModifiedDate: Date;
    CreatedBy?: string;
    Key: string;
    AssociatedLocationIds: string[];
    Name: string;
    ShortDescription?: string;
    IsVerified: boolean;
    IsPublished: boolean;
    RegisteredCharity?: number;
    Description?: string;
    AreaServiced?: string;
    Tags?: string;
    DonationUrl?: string;
    DonationDescription?: string;
    ItemsDonationUrl?: string;
    ItemsDonationDescription?: string;
    Email?: string;
    Telephone?: string;
    Website?: string;
    Facebook?: string;
    Twitter?: string;
    Addresses: IAddress[];
    NeedCategories: INeedCategory[];
}