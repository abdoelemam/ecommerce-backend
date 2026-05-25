import { NextFunction, Request, Response } from "express";
import userModel from "../../model/user.model.js";
import productModel from "../../model/product.model.js";
import AppError from "../../utils/AppError.js";
import { AuthRequest } from "../../middleware/auth.js";

class WishlistService {
    // [1] Add Product to Wishlist (Toggle)
    async addToWishlist(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { productId } = req.params;
            const userId = req.user?._id;

            // Check product exists
            const product = await productModel.findById(productId);
            if (!product) {
                throw new AppError("Product not found", 404);
            }

            // Check if already in wishlist
            const user = await userModel.findById(userId);
            if (!user) {
                throw new AppError("User not found", 404);
            }

            const isInWishlist = user.wishlist.some(
                (id) => id.toString() === productId
            );

            if (isInWishlist) {
                // Remove from wishlist (Toggle OFF)
                await userModel.findByIdAndUpdate(userId, {
                    $pull: { wishlist: productId },
                });

                return res.status(200).json({
                    message: "Product removed from wishlist",
                    data: { action: "removed" },
                });
            } else {
                // Add to wishlist (Toggle ON)
                await userModel.findByIdAndUpdate(userId, {
                    $addToSet: { wishlist: productId },
                });

                return res.status(200).json({
                    message: "Product added to wishlist",
                    data: { action: "added" },
                });
            }
        } catch (error) {
            next(error);
        }
    }

    // [2] Get My Wishlist
    async getWishlist(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?._id;

            const user = await userModel
                .findById(userId)
                .populate("wishlist", "name slug finalPrice price discount images stock");

            if (!user) {
                throw new AppError("User not found", 404);
            }

            return res.status(200).json({
                message: "Wishlist fetched successfully",
                data: { wishlist: user.wishlist },
            });
        } catch (error) {
            next(error);
        }
    }

    // [3] Remove from Wishlist
    async removeFromWishlist(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { productId } = req.params;
            const userId = req.user?._id;

            await userModel.findByIdAndUpdate(userId, {
                $pull: { wishlist: productId },
            });

            return res.status(200).json({
                message: "Product removed from wishlist",
            });
        } catch (error) {
            next(error);
        }
    }

    // [4] Clear Wishlist
    async clearWishlist(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?._id;

            await userModel.findByIdAndUpdate(userId, {
                wishlist: [],
            });

            return res.status(200).json({
                message: "Wishlist cleared successfully",
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new WishlistService();
