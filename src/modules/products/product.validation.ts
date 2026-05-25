import { z } from "zod";

export const createProductSchema = {
    body: z.object({
        name: z.string().min(2, "Name must be at least 2 characters").max(100),
        description: z.string().min(10, "Description must be at least 10 characters"),
        price: z.preprocess((a) => Number(a), z.number().min(0, "Price must be at least 0")),
        discount: z.preprocess((a) => a ? Number(a) : 0, z.number().min(0).max(100).optional()),
        variants: z.preprocess(
            (val) => {
                if (typeof val === 'string') {
                    try { return JSON.parse(val); } catch (e) { return val; }
                }
                return val;
            },
            z.array(
                z.object({
                    color: z.string().optional(),
                    size: z.string().optional(),
                    stock: z.number().min(0, "Stock cannot be negative"),
                    priceDiff: z.number().optional(),
                })
            ).optional()
        ),
        categoryId: z.string().length(24, "Invalid Category ID"),
        brandId: z.string().length(24, "Invalid Brand ID").optional(),
        colorImageMapping: z.preprocess(
            (val) => {
                if (typeof val === 'string') {
                    try { return JSON.parse(val); } catch (e) { return val; }
                }
                return val;
            },
            z.record(z.string(), z.array(z.number())).optional()
        ),
    }),
};

export const updateProductSchema = {
    body: z.object({
        name: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
        description: z.string().min(10).optional(),
        price: z.preprocess((a) => a ? Number(a) : undefined, z.number().min(0).optional()),
        discount: z.preprocess((a) => a ? Number(a) : undefined, z.number().min(0).max(100).optional()),
        variants: z.preprocess(
            (val) => {
                if (typeof val === 'string') {
                    try { return JSON.parse(val); } catch (e) { return val; }
                }
                return val;
            },
            z.array(
                z.object({
                    color: z.string().optional(),
                    size: z.string().optional(),
                    stock: z.number().min(0, "Stock cannot be negative"),
                    priceDiff: z.number().optional(),
                })
            ).optional()
        ),
        categoryId: z.string().length(24, "Invalid Category ID").optional(),
        brandId: z.string().length(24, "Invalid Brand ID").optional(),
        colorImageMapping: z.preprocess(
            (val) => {
                if (typeof val === 'string') {
                    try { return JSON.parse(val); } catch (e) { return val; }
                }
                return val;
            },
            z.record(z.string(), z.array(z.number())).optional()
        ),
    }),
    params: z.object({
        id: z.string().length(24, "Invalid Product ID"),
    }),
};
