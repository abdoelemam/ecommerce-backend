import mongoose, { Document, Model, Schema, Types } from "mongoose";

export enum OrderStatus {
  pending = "pending",
  processing = "processing",
  shipped = "shipped",
  delivered = "delivered",
  cancelled = "cancelled",
}

export enum PaymentMethod {
  cash = "cash",
  card = "card",
}

export interface IOrderItem {
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  quantity: number;
  price: number;
  finalPrice: number;
}

export interface IOrder extends Document {
  userId: Types.ObjectId;
  items: IOrderItem[];
  totalPrice: number;
  shippingAddress: {
    street: string;
    city: string;
    phone: string;
  };
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  isPaid: boolean;
  paidAt?: Date;
  couponId?: Types.ObjectId;
  discount?: number;
  priceAfterDiscount?: number;
  cancelledAt?: Date;
  deliveredAt?: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true },
        finalPrice: { type: Number, required: true },
      },
    ],
    totalPrice: {
      type: Number,
      required: true,
    },
    shippingAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      phone: { type: String, required: true },
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      default: PaymentMethod.cash,
    },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.pending,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paidAt: Date,
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
    cancelledAt: Date,
    deliveredAt: Date,
  },
  {
    timestamps: true,
  }
);

const orderModel: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>("Order", orderSchema);

export default orderModel;
