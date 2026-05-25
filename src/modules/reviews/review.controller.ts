import { Router } from "express";
import { validate } from "../../middleware/validation.js";
import { addReviewSchema, updateReviewSchema, reviewParamsSchema } from "./review.validation.js";
import reviewService from "./review.service.js";
import { auth, authorize } from "../../middleware/auth.js";
import { Roletype } from "../../model/user.model.js";

const reviewRouter = Router();

// GET /reviews/:productId - Get all reviews for a product (Public endpoint)
reviewRouter.get("/:productId", validate({ params: addReviewSchema.params }), reviewService.getProductReviews);

// POST /reviews/:productId - Add a review
reviewRouter.post("/:productId", auth, validate(addReviewSchema), reviewService.addReview);

// PUT /reviews/:id - Update a review
reviewRouter.put("/:id", auth, validate(updateReviewSchema), reviewService.updateReview);

// DELETE /reviews/:id - Delete a review
reviewRouter.delete("/:id", auth, validate(reviewParamsSchema), reviewService.deleteReview);

// ========== Admin Routes ==========

// GET /reviews (Admin Only)
reviewRouter.get("/", auth, authorize(Roletype.admin), reviewService.getAllReviewsAdmin);

export default reviewRouter;
