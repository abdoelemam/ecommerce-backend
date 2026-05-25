import mongoose, { Document, Model, Schema, Types } from "mongoose";

export enum DiscountType {
  percentage = "percentage",
  fixedAmount = "fixedAmount",
}

export interface ICoupon extends Document {
  code: string;
  discount: number;
  discountType: DiscountType;
  minOrderAmount: number;
  maxDiscount?: number;
  expiresAt: Date;
  usageLimit: number;
  usedCount: number;
  usedBy: Types.ObjectId[];
  createdBy: Types.ObjectId;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    discount: {
      type: Number,
      required: true,
      min: 1,
    },
    discountType: {
      type: String,
      enum: Object.values(DiscountType),
      default: DiscountType.percentage,
    },
    minOrderAmount: {
      type: Number,
      default: 0,
    },
    maxDiscount: {
      type: Number, // Only relevant for percentage type
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    usageLimit: {
      type: Number,
      default: 100,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    usedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
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

const couponModel: Model<ICoupon> =
  mongoose.models.Coupon || mongoose.model<ICoupon>("Coupon", couponSchema);

export default couponModel;
