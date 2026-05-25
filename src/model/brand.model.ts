import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IBrand extends Document {
  name: string;
  slug: string;
  image: {
    secure_url: string;
    key: string;
  };
  createdBy: Types.ObjectId;
}

const brandSchema = new Schema<IBrand>(
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
      secure_url: { type: String, required: true },
      key: { type: String, required: true },
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

const brandModel: Model<IBrand> =
  mongoose.models.Brand || mongoose.model<IBrand>("Brand", brandSchema);

export default brandModel;
