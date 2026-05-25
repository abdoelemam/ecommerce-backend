import { z } from "zod";

export const addToCartSchema = {
    body: z.object({
        productId: z.string().length(24, "Invalid Product ID"),
        variantId: z.string().length(24, "Invalid Variant ID"),
        quantity: z.preprocess((a) => a ? Number(a) : 1, z.number().min(1, "Quantity must be at least 1")),
    }),
};

export const updateCartItemSchema = {
    body: z.object({
        quantity: z.preprocess((a) => Number(a), z.number().min(1, "Quantity must be at least 1")),
    }),
    params: z.object({
        productId: z.string().length(24, "Invalid Product ID"),
    }),
};

export const removeCartItemSchema = {
    params: z.object({
        productId: z.string().length(24, "Invalid Product ID"),
    }),
};
