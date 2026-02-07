import { Document, Types } from "mongoose";
import { IAddress } from "./IAddress.js";
import { INote } from "./INote.js";
import { IAdministrator } from "./IAdministrator.js";

export interface IOrganisation extends Document {
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
    Tags?: string;
    Email?: string;
    Telephone?: string;
    Website?: string;
    Facebook?: string;
    Twitter?: string;
    Bluesky?: string;
    Instagram?: string;
    Addresses: IAddress[];
    Notes: INote[];
    Administrators: IAdministrator[];
}