import { NextFunction, Request, Response } from "express";
import couponModel, { DiscountType } from "../../model/coupon.model.js";
import cartModel from "../../model/cart.model.js";
import AppError from "../../utils/AppError.js";
import { AuthRequest } from "../../middleware/auth.js";

class CouponService {
    // ========== Admin Endpoints ==========

    // [1] Create Coupon (Admin)
    async createCoupon(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { code, discount, discountType, minOrderAmount, maxDiscount, expiresAt, usageLimit } = req.body;

            const existingCoupon = await couponModel.findOne({ code: code.toUpperCase() });
            if (existingCoupon) {
                throw new AppError("Coupon code already exists", 409);
            }

            const coupon = await couponModel.create({
                code: code.toUpperCase(),
                discount,
                discountType: discountType || DiscountType.percentage,
                minOrderAmount: minOrderAmount || 0,
                maxDiscount,
                expiresAt: new Date(expiresAt),
                usageLimit: usageLimit || 100,
                createdBy: req.user?._id,
            });

            return res.status(201).json({
                message: "Coupon created successfully",
                data: { coupon },
            });
        } catch (error) {
            next(error);
        }
    }

    // [2] Get All Coupons (Admin)
    async getAllCoupons(req: Request, res: Response, next: NextFunction) {
        try {
            const coupons = await couponModel.find().populate("createdBy", "username email");

            return res.status(200).json({
                message: "Coupons fetched successfully",
                data: { coupons },
            });
        } catch (error) {
            next(error);
        }
    }

    // [3] Update Coupon (Admin)
    async updateCoupon(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            const coupon = await couponModel.findByIdAndUpdate(id, req.body, { new: true });
            if (!coupon) {
                throw new AppError("Coupon not found", 404);
            }

            return res.status(200).json({
                message: "Coupon updated successfully",
                data: { coupon },
            });
        } catch (error) {
            next(error);
        }
    }

    // [4] Delete Coupon (Admin)
    async deleteCoupon(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            const coupon = await couponModel.findByIdAndDelete(id);
            if (!coupon) {
                throw new AppError("Coupon not found", 404);
            }

            return res.status(200).json({
                message: "Coupon deleted successfully",
            });
        } catch (error) {
            next(error);
        }
    }

    // ========== User Endpoints ==========

    // [5] Apply Coupon to Cart
    async applyCoupon(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { code } = req.body;
            const userId = req.user?._id;

            if (!userId) {
                throw new AppError("User not authorized", 401);
            }

            // 1. Find coupon
            const coupon = await couponModel.findOne({ code: code.toUpperCase() });
            if (!coupon) {
                throw new AppError("Invalid coupon code", 404);
            }

            // 2. Check expiry
            if (coupon.expiresAt < new Date()) {
                throw new AppError("Coupon has expired", 400);
            }

            // 3. Check usage limit
            if (coupon.usedCount >= coupon.usageLimit) {
                throw new AppError("Coupon usage limit reached", 400);
            }

            // 4. Check if user already used this coupon
            const alreadyUsed = coupon.usedBy.some(
                (id) => id.toString() === userId.toString()
            );
            if (alreadyUsed) {
                throw new AppError("You have already used this coupon", 400);
            }

            // 5. Get cart
            const cart = await cartModel.findOne({ userId });
            if (!cart || cart.items.length === 0) {
                throw new AppError("Cart is empty", 400);
            }

            // 6. Check minimum order amount
            if (cart.totalPrice < coupon.minOrderAmount) {
                throw new AppError(
                    `Minimum order amount is ${coupon.minOrderAmount} to use this coupon`,
                    400
                );
            }

            // 7. Calculate discount
            let discountAmount: number;
            if (coupon.discountType === DiscountType.percentage) {
                discountAmount = cart.totalPrice * (coupon.discount / 100);
                // Apply max discount cap
                if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
                    discountAmount = coupon.maxDiscount;
                }
            } else {
                // Fixed amount
                discountAmount = coupon.discount;
            }

            // Make sure discount doesn't exceed total
            if (discountAmount > cart.totalPrice) {
                discountAmount = cart.totalPrice;
            }

            const priceAfterDiscount = cart.totalPrice - discountAmount;

            // 8. Save coupon info on cart
            cart.couponId = coupon._id as any;
            cart.discount = discountAmount;
            cart.priceAfterDiscount = priceAfterDiscount;
            await cart.save();

            return res.status(200).json({
                message: "Coupon applied successfully",
                data: {
                    totalPrice: cart.totalPrice,
                    discount: discountAmount,
                    priceAfterDiscount,
                    couponCode: coupon.code,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    // [6] Remove Coupon from Cart
    async removeCoupon(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?._id;
            
            if (!userId) {
                throw new AppError("User not authorized", 401);
            }

            const cart = await cartModel.findOne({ userId });
            if (!cart) {
                throw new AppError("Cart not found", 404);
            }

            cart.couponId = undefined;
            cart.discount = 0;
            cart.priceAfterDiscount = cart.totalPrice;
            await cart.save();

            return res.status(200).json({
                message: "Coupon removed successfully",
                data: { cart },
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new CouponService();
