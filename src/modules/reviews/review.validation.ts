import { z } from "zod";

export const addReviewSchema = {
    body: z.object({
        comment: z.string().min(3, "Comment must be at least 3 characters"),
        rating: z.number().min(1, "Minimum rating is 1").max(5, "Maximum rating is 5"),
    }),
    params: z.object({
        productId: z.string().length(24, "Invalid Product ID"),
    }),
};

export const updateReviewSchema = {
    body: z.object({
        comment: z.string().min(3).optional(),
        rating: z.number().min(1).max(5).optional(),
    }),
    params: z.object({
        id: z.string().length(24, "Invalid Review ID"),
    }),
};

export const reviewParamsSchema = {
    params: z.object({
        id: z.string().length(24, "Invalid ID"),
    }),
};
