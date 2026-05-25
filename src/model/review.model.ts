import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IReview extends Document {
  comment: string;
  rating: number; // 1-5
  productId: Types.ObjectId;
  userId: Types.ObjectId;
}

const reviewSchema = new Schema<IReview>(
  {
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent user from reviewing the same product twice
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

// ======== Ratings Calculation (The Magic! 🪄) ========
reviewSchema.statics.calcAverageRatings = async function (productId: Types.ObjectId) {
  const stats = await this.aggregate([
    { $match: { productId } },
    {
      $group: {
        _id: "$productId",
        rateCount: { $sum: 1 },
        rateAvg: { $avg: "$rating" },
      },
    },
  ]);

  if (stats.length > 0) {
    await mongoose.model("Product").findByIdAndUpdate(productId, {
      rateCount: stats[0].rateCount,
      rateAvg: Math.round(stats[0].rateAvg * 10) / 10, // Round to 1 decimal
    });
  } else {
    // If all reviews are deleted
    await mongoose.model("Product").findByIdAndUpdate(productId, {
      rateCount: 0,
      rateAvg: 0,
    });
  }
};

// 1. Trigger when a review is added
reviewSchema.post("save", function () {
  // this points to the current review document
  (this.constructor as any).calcAverageRatings(this.productId);
});

// 2. Trigger when a review is updated or deleted
// Because findOneAndUpdate and findOneAndDelete don't have document middleware, we use query middleware
reviewSchema.post(/^findOneAnd/, async function (doc) {
  if (doc) {
    await (doc.constructor as any).calcAverageRatings(doc.productId);
  }
});

// extend the static methods type
interface IReviewModel extends Model<IReview> {
  calcAverageRatings(productId: Types.ObjectId): Promise<void>;
}

const reviewModel: IReviewModel =
  (mongoose.models.Review as IReviewModel) ||
  mongoose.model<IReview, IReviewModel>("Review", reviewSchema);

export default reviewModel;
