import { NextFunction, Request, Response } from "express";
import cartModel from "../../model/cart.model.js";
import productModel from "../../model/product.model.js";
import AppError from "../../utils/AppError.js";
import { AuthRequest } from "../../middleware/auth.js";

class CartService {
    // [1] Add to Cart
    async addToCart(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { productId, variantId, quantity } = req.body;
            const userId = req.user?._id;

            // 1. Check product exists and has stock
            const product = await productModel.findById(productId);
            if (!product) {
                throw new AppError("Product not found", 404);
            }
            
            // Find specific variant
            const variant = product.variants.find(v => v._id?.toString() === variantId);
            if (!variant) {
                throw new AppError("Variant not found in this product", 404);
            }

            if (variant.stock < quantity) {
                throw new AppError(`Only ${variant.stock} items available in stock for this variant`, 400);
            }

            // Calculate exact pricing based on variant difference
            const exactPrice = product.price + (variant.priceDiff || 0);
            const exactFinalPrice = exactPrice - (exactPrice * (product.discount / 100));

            // 2. Find or create cart for this user
            let cart = await cartModel.findOne({ userId });

            if (!cart) {
                // Create new cart
                cart = await cartModel.create({
                    userId,
                    items: [{
                        productId,
                        variantId,
                        quantity,
                        price: exactPrice,
                        finalPrice: exactFinalPrice,
                    }],
                });
            } else {
                // Check if identical product AND variant already in cart
                const existingItem = cart.items.find(
                    (item) => item.productId.toString() === productId && item.variantId.toString() === variantId
                );

                if (existingItem) {
                    // Update quantity
                    const newQty = existingItem.quantity + quantity;
                    if (variant.stock < newQty) {
                        throw new AppError(`Only ${variant.stock} items available in stock for this variant`, 400);
                    }
                    existingItem.quantity = newQty;
                } else {
                    // Add new variant item
                    cart.items.push({
                        productId,
                        variantId,
                        quantity,
                        price: exactPrice,
                        finalPrice: exactFinalPrice,
                    } as any);
                }
            }

            // 3. Recalculate total and save
            cart.calcTotalPrice();
            await cart.save();

            return res.status(200).json({
                message: "Product added to cart",
                data: { cart }
            });
        } catch (error) {
            next(error);
        }
    }

    // [2] Get Cart
    async getCart(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?._id;

            const cart = await cartModel.findOne({ userId })
                .populate("items.productId", "name slug finalPrice images stock");

            if (!cart) {
                return res.status(200).json({
                    message: "Cart is empty",
                    data: { cart: { items: [], totalPrice: 0 } }
                });
            }

            return res.status(200).json({
                message: "Cart fetched successfully",
                data: { cart }
            });
        } catch (error) {
            next(error);
        }
    }

    // [3] Update Cart Item Quantity
    async updateCartItem(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { productId } = req.params;
            const { quantity } = req.body;
            const userId = req.user?._id;

            const cart = await cartModel.findOne({ userId });
            if (!cart) {
                throw new AppError("Cart not found", 404);
            }

            const item = cart.items.find(
                (item) => item.productId.toString() === productId // Assuming update via params handles primary item or we could adjust it to use itemId
            );
            if (!item) {
                throw new AppError("Product not found in cart", 404);
            }

            // Check stock of the specific variant
            const product = await productModel.findById(productId);
            if (!product) {
                throw new AppError("Product no longer exists", 404);
            }
            const variant = product.variants.find(v => v._id?.toString() === item.variantId.toString());
            if (!variant) {
                 throw new AppError("Variant no longer exists", 404);
            }
            if (variant.stock < quantity) {
                throw new AppError(`Only ${variant.stock} items available in stock`, 400);
            }

            item.quantity = quantity;

            cart.calcTotalPrice();
            await cart.save();

            return res.status(200).json({
                message: "Cart updated successfully",
                data: { cart }
            });
        } catch (error) {
            next(error);
        }
    }

    // [4] Remove Item from Cart
    async removeCartItem(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { productId } = req.params;
            const userId = req.user?._id;

            const cart = await cartModel.findOne({ userId });
            if (!cart) {
                throw new AppError("Cart not found", 404);
            }

            const itemIndex = cart.items.findIndex(
                (item) => item.productId.toString() === productId
            );
            if (itemIndex === -1) {
                throw new AppError("Product not found in cart", 404);
            }

            cart.items.splice(itemIndex, 1);

            cart.calcTotalPrice();
            await cart.save();

            return res.status(200).json({
                message: "Item removed from cart",
                data: { cart }
            });
        } catch (error) {
            next(error);
        }
    }

    // [5] Clear Cart
    async clearCart(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user?._id;

            const cart = await cartModel.findOne({ userId });
            if (!cart) {
                throw new AppError("Cart not found", 404);
            }

            cart.items = [];
            cart.totalPrice = 0;
            await cart.save();

            return res.status(200).json({
                message: "Cart cleared successfully",
                data: { cart }
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new CartService();
