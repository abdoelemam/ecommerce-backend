import { Router } from "express";
import { validate } from "../../middleware/validation.js";
import { createCouponSchema, updateCouponSchema, applyCouponSchema } from "./coupon.validation.js";
import couponService from "./coupon.service.js";
import { auth, authorize } from "../../middleware/auth.js";
import { Roletype } from "../../model/user.model.js";

const couponRouter = Router();

// All coupon routes require authentication
couponRouter.use(auth);

// ========== User Routes ==========

// POST /coupons/apply - Apply coupon to cart
couponRouter.post("/apply", validate(applyCouponSchema), couponService.applyCoupon);

// DELETE /coupons/remove - Remove coupon from cart
couponRouter.delete("/remove", couponService.removeCoupon);

// ========== Admin Routes ==========

// GET /coupons - Get all coupons (Admin)
couponRouter.get("/", authorize(Roletype.admin), couponService.getAllCoupons);

// POST /coupons - Create coupon (Admin)
couponRouter.post("/", authorize(Roletype.admin), validate(createCouponSchema), couponService.createCoupon);

// PUT /coupons/:id - Update coupon (Admin)
couponRouter.put("/:id", authorize(Roletype.admin), validate(updateCouponSchema), couponService.updateCoupon);

// DELETE /coupons/:id - Delete coupon (Admin)
couponRouter.delete("/:id", authorize(Roletype.admin), couponService.deleteCoupon);

export default couponRouter;
