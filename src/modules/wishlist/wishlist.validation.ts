import { z } from "zod";

export const wishlistProductSchema = {
    params: z.object({
        productId: z.string().length(24, "Invalid Product ID"),
    }),
};
