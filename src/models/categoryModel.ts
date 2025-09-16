import mongoose, { Schema } from "mongoose";
import { SubCategorySchema, ICategory } from "@/types/index.js";

const categorySchema = new Schema<ICategory>({
    _id: {
        type: String,
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
    SortOrder: {
        type: Number,
        required: true,
    },
    Name: {
        type: String,
        required: true,
    },
    Synopsis: String,
    SubCategories: [SubCategorySchema],
}, { collection: 'NestedServiceCategories', versionKey: false });

const Category = mongoose.model<ICategory>("NestedServiceCategories", categorySchema);

export default Category;
