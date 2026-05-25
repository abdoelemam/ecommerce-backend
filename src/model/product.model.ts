import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IProductVariant {
  _id?: Types.ObjectId;
  color?: string;
  size?: string;
  stock: number;
  priceDiff: number;
  images?: {
    secure_url: string;
    key: string;
  }[];
}

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  price: number;
  discount: number;
  finalPrice: number;
  variants: IProductVariant[];
  images: {
    secure_url: string;
    key: string;
  }[];
  categoryId: Types.ObjectId;
  brandId?: Types.ObjectId;
  createdBy: Types.ObjectId;
  rateAvg: number;
  rateCount: number;
}

const productSchema = new Schema<IProduct>(
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
    description: {
      type: String,
      required: true,
      minlength: 10,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100, // percentage
    },
    finalPrice: {
      type: Number,
      min: 0,
    },
    variants: [
      {
        color: { type: String, default: "N/A" },
        size: { type: String, default: "N/A" },
        stock: { type: Number, required: true, min: 0, default: 0 },
        priceDiff: { type: Number, default: 0 },
        images: [
          {
            secure_url: { type: String },
            key: { type: String },
          }
        ],
      }
    ],
    images: [
      {
        secure_url: { type: String, required: true },
        key: { type: String, required: true },
      },
    ],
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    brandId: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rateAvg: {
      type: Number,
      default: 0,
    },
    rateCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to calculate the final price
productSchema.pre('validate', function() {
    if (this.price && this.discount !== undefined) {
        this.finalPrice = this.price - (this.price * (this.discount / 100));
    } else if (this.price) {
        this.finalPrice = this.price;
    }
});

const productModel: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", productSchema);

export default productModel;
