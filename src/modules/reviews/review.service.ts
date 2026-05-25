import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import reviewModel from "../../model/review.model.js";
import productModel from "../../model/product.model.js";
import orderModel, { OrderStatus } from "../../model/order.model.js";
import AppError from "../../utils/AppError.js";
import { AuthRequest } from "../../middleware/auth.js";
import { Roletype } from "../../model/user.model.js";

class ReviewService {
    // [1] Add Review
    async addReview(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const productId = req.params.productId as string;
            const { comment, rating } = req.body;
            const userId = req.user?._id;

            if (!userId) throw new AppError("Unauthorized", 401);

            // 1. Verify Product exists
            const product = await productModel.findById(productId);
            if (!product) {
                throw new AppError("Product not found", 404);
            }

            // 2. Check if user has bought the product and order is delivered
            const hasBought = await orderModel.findOne({
                userId,
                status: OrderStatus.delivered,
                "items.productId": productId,
            });

            if (!hasBought) {
                throw new AppError("You can only review products you have bought and received", 403);
            }

            // 3. Prevent duplicate reviews (handled partially by DB index as well)
            const existingReview = await reviewModel.findOne({ userId, productId });
            if (existingReview) {
                throw new AppError("You have already reviewed this product", 409);
            }

            // 4. Create Review (Mongoose post-save hook will automatically update product rating)
            const review = await reviewModel.create({
                comment,
                rating,
                productId,
                userId,
            });

            return res.status(201).json({
                message: "Review added successfully",
                data: { review },
            });
        } catch (error) {
            next(error);
        }
    }

    // [2] Get All Reviews for a Product (Public)
    async getProductReviews(req: Request, res: Response, next: NextFunction) {
        try {
            const productId = req.params.productId as string;

            const reviews = await reviewModel
                .find({ productId })
                .populate("userId", "username profilePic fname lname name") // Get user info
                .sort("-createdAt"); // Newest first

            return res.status(200).json({
                message: "Reviews fetched successfully",
                data: { reviews },
            });
        } catch (error) {
            next(error);
        }
    }

    // [3] Update Review
    async updateReview(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { comment, rating } = req.body;
            const userId = req.user?._id;

            if (!userId) throw new AppError("Unauthorized", 401);

            const review = await reviewModel.findById(id);
            if (!review) {
                throw new AppError("Review not found", 404);
            }

            // Check Ownership
            if (review.userId.toString() !== userId.toString()) {
                throw new AppError("You can only update your own reviews", 403);
            }

            if (comment) review.comment = comment;
            if (rating) review.rating = rating;

            // This will NOT trigger /^findOneAnd/ but it will trigger "save".
            // Since our post hook is on "save", calcAverageRatings will run automatically!
            await review.save();

            return res.status(200).json({
                message: "Review updated successfully",
                data: { review },
            });
        } catch (error) {
            next(error);
        }
    }

    // [4] Delete Review
    async deleteReview(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const userId = req.user?._id;
            const userRole = req.user?.role;

            if (!userId) throw new AppError("Unauthorized", 401);

            const review = await reviewModel.findById(id);
            if (!review) {
                throw new AppError("Review not found", 404);
            }

            // Allow delete if user is the OWNER or is an ADMIN
            if (review.userId.toString() !== userId.toString() && userRole !== Roletype.admin) {
                throw new AppError("You are not authorized to delete this review", 403);
            }

            // Using findByIdAndDelete triggers the /^findOneAnd/ hook to recalculate rating
            await reviewModel.findByIdAndDelete(id);

            return res.status(200).json({
                message: "Review deleted successfully",
            });
        } catch (error) {
            next(error);
        }
    }
    // ========== Admin Endpoints ==========

    async getAllReviewsAdmin(req: Request, res: Response, next: NextFunction) {
        try {
            const { page = "1", limit = "10" } = req.query as Record<string, string>;

            const pageNum = Math.max(parseInt(page), 1);
            const limitNum = Math.max(parseInt(limit), 1);
            const skip = (pageNum - 1) * limitNum;

            const [reviews, totalCount] = await Promise.all([
                reviewModel.find()
                    .populate("userId", "username email fname lname name")
                    .populate("productId", "name images")
                    .sort("-createdAt")
                    .skip(skip)
                    .limit(limitNum),
                reviewModel.countDocuments(),
            ]);

            const totalPages = Math.ceil(totalCount / limitNum);

            return res.status(200).json({
                message: "Reviews fetched successfully",
                data: {
                    reviews,
                    pagination: {
                        currentPage: pageNum,
                        totalPages,
                        totalCount,
                        limit: limitNum,
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new ReviewService();
