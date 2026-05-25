import { Router } from "express";
import { validate } from "../../middleware/validation.js";
import { addToCartSchema, updateCartItemSchema, removeCartItemSchema } from "./cart.validation.js";
import cartService from "./cart.service.js";
import { auth } from "../../middleware/auth.js";

const cartRouter = Router();

// All cart routes require authentication
cartRouter.use(auth);

// GET /cart - Get my cart
cartRouter.get("/", cartService.getCart);

// POST /cart - Add product to cart
cartRouter.post("/", validate(addToCartSchema), cartService.addToCart);

// PUT /cart/:productId - Update item quantity
cartRouter.put("/:productId", validate(updateCartItemSchema), cartService.updateCartItem);

// DELETE /cart/:productId - Remove item from cart
cartRouter.delete("/:productId", validate(removeCartItemSchema), cartService.removeCartItem);

// DELETE /cart - Clear entire cart
cartRouter.delete("/", cartService.clearCart);

export default cartRouter;
