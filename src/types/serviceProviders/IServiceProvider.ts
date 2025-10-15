import { Document, Types } from "mongoose";
import { IAddress } from "./IAddress.js";
import { INotes } from "./INotes.js";
import { IAdministrator } from "./IAdministrator.js";

export interface IServiceProvider extends Document {
    _id: Types.ObjectId;
    DocumentCreationDate: Date;
    DocumentModifiedDate: Date;
    CreatedBy: string;
    Key: string;
    AssociatedLocationIds: string[];
    Name: string;
    ShortDescription: string;
    Description: string;
    IsVerified: boolean;
    IsPublished: boolean;
    RegisteredCharity?: number;
    Tags?: string;
    Email?: string;
    Telephone?: string;
    Website?: string;
    Facebook?: string;
    Twitter?: string;
    Addresses: IAddress[];
    Notes: INotes[];
    Administrators: IAdministrator[];
}