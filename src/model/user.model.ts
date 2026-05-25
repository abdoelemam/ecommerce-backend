import mongoose, { Document, Model, Schema, Types } from "mongoose";

// ======== Enums ========
export enum Gendertype {
  male = "male",
  female = "female",
}

export enum Roletype {
  user = "user",
  admin = "admin",
}

// ======== Interface ========
export interface IAddress {
  street: string;
  city: string;
  state?: string;
  country: string;
  zipCode?: string;
  phone?: string;
  isDefault?: boolean;
}

export interface IUser extends Document {
  fname: string;
  lname: string;
  email: string;
  password: string;
  phone?: string;
  age?: number;
  DOB?: Date;
  gender?: Gendertype;
  role?: Roletype;
  profilePic?: string;
  isVerified: boolean;
  isBlocked: boolean;
  isDeleted: boolean;
  otp?: string;
  otpExpiry?: Date;
  passwordChangedAt?: Date;
  addresses: IAddress[];
  wishlist: Types.ObjectId[];
  // Virtual
  username: string;
}

// ======== Schema ========
const userschema = new Schema<IUser>(
  {
    fname: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 20,
    },
    lname: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 20,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    phone: {
      type: String,
      required: true,
    },
    age: {
      type: Number,
      min: 10,
      max: 100,
    },
    DOB: {
      type: Date,
    },
    gender: {
      type: String,
      enum: Object.values(Gendertype),
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(Roletype),
      default: Roletype.user,
    },
    profilePic: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
    },
    otpExpiry: {
      type: Date,
    },
    passwordChangedAt: {
      type: Date,
    },
    addresses: [
      {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String },
        country: { type: String, required: true },
        zipCode: { type: String },
        phone: { type: String },
        isDefault: { type: Boolean, default: false },
      },
    ],
    wishlist: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ======== Virtuals ========
userschema
  .virtual("username")
  .set(function (this: IUser, value: string) {
    const [fname, lname] = value.split(" ");
    this.set({ fname, lname });
  })
  .get(function (this: IUser) {
    return this.fname + " " + this.lname;
  });

// ======== Model ========
const userModel: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", userschema);

export default userModel;
