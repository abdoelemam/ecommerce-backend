import { z } from "zod";

export const createCategorySchema = {
    body: z.object({
        name: z.string().min(2, "Name must be at least 2 characters").max(50),
        parentId: z.string().length(24, "Invalid Parent Category ID").optional(),
    }),
};

export const updateCategorySchema = {
    body: z.object({
        name: z.string().min(2, "Name must be at least 2 characters").max(50).optional(),
        parentId: z.string().length(24, "Invalid Parent Category ID").optional(),
    }),
    params: z.object({
        id: z.string().length(24, "Invalid Category ID"),
    }),
};
