import { z } from "zod";
import { DiscountType } from "../../model/coupon.model.js";

export const createCouponSchema = {
    body: z.object({
        code: z.string().min(3, "Code must be at least 3 characters").max(20),
        discount: z.number().min(1, "Discount must be at least 1"),
        discountType: z.nativeEnum(DiscountType).optional(),
        minOrderAmount: z.number().min(0).optional(),
        maxDiscount: z.number().min(1).optional(),
        expiresAt: z.coerce.date({ invalid_type_error: "Invalid date format" }),
        usageLimit: z.number().min(1).optional(),
    }),
};

export const updateCouponSchema = {
    body: z.object({
        discount: z.number().min(1).optional(),
        discountType: z.nativeEnum(DiscountType).optional(),
        minOrderAmount: z.number().min(0).optional(),
        maxDiscount: z.number().min(1).optional(),
        expiresAt: z.coerce.date({ invalid_type_error: "Invalid date format" }).optional(),
        usageLimit: z.number().min(1).optional(),
    }),
    params: z.object({
        id: z.string().length(24, "Invalid Coupon ID"),
    }),
};

export const applyCouponSchema = {
    body: z.object({
        code: z.string().min(1, "Coupon code is required"),
    }),
};
