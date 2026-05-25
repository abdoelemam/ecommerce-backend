import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface ICartItem {
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  quantity: number;
  price: number;      // price at the time of adding
  finalPrice: number;  // finalPrice at the time of adding
}

export interface ICart extends Document {
  userId: Types.ObjectId;
  items: ICartItem[];
  totalPrice: number;
  couponId?: Types.ObjectId;
  discount?: number;
  priceAfterDiscount?: number;
  calcTotalPrice(): void;
}

const cartSchema = new Schema<ICart>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // Each user has only ONE cart
    },
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        variantId: {
          type: Schema.Types.ObjectId,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
          default: 1,
        },
        price: {
          type: Number,
          required: true,
        },
        finalPrice: {
          type: Number,
          required: true,
        },
      },
    ],
    totalPrice: {
      type: Number,
      default: 0,
    },
    couponId: {
      type: Schema.Types.ObjectId,
      ref: "Coupon",
    },
    discount: {
      type: Number,
      default: 0,
    },
    priceAfterDiscount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Method to recalculate total price
cartSchema.methods.calcTotalPrice = function () {
  this.totalPrice = this.items.reduce(
    (total: number, item: ICartItem) => total + item.finalPrice * item.quantity,
    0
  );
};

const cartModel: Model<ICart> =
  mongoose.models.Cart || mongoose.model<ICart>("Cart", cartSchema);

export default cartModel;
