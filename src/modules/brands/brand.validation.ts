import { z } from "zod";

export const createBrandSchema = {
    body: z.object({
        name: z.string().min(2, "Name must be at least 2 characters").max(50),
    }),
};

export const updateBrandSchema = {
    body: z.object({
        name: z.string().min(2, "Name must be at least 2 characters").max(50).optional(),
    }),
    params: z.object({
        id: z.string().length(24, "Invalid Brand ID"),
    }),
};
