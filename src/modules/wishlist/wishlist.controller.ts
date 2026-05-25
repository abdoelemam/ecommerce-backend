import { Router } from "express";
import { validate } from "../../middleware/validation.js";
import { wishlistProductSchema } from "./wishlist.validation.js";
import wishlistService from "./wishlist.service.js";
import { auth } from "../../middleware/auth.js";

const wishlistRouter = Router();

// All wishlist routes require authentication
wishlistRouter.use(auth);

// GET /wishlist - Get my wishlist
wishlistRouter.get("/", wishlistService.getWishlist);

// PATCH /wishlist/:productId - Toggle add/remove product
wishlistRouter.patch("/:productId", validate(wishlistProductSchema), wishlistService.addToWishlist);

// DELETE /wishlist/:productId - Remove specific product
wishlistRouter.delete("/:productId", validate(wishlistProductSchema), wishlistService.removeFromWishlist);

// DELETE /wishlist - Clear wishlist
wishlistRouter.delete("/", wishlistService.clearWishlist);

export default wishlistRouter;
