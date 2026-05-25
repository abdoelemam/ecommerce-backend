import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface ICategory extends Document {
  name: string;
  slug: string;
  image?: {
    secure_url: string;
    key: string; 
  };
  parentId?: Types.ObjectId | null;
  createdBy: Types.ObjectId;
}

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    image: {
      type: {
        secure_url: String,
        key: String,
      },
      required: false,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const categoryModel: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>("Category", categorySchema);

export default categoryModel;
