import express, { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";
import AppError from "../utils/AppError.js";


type reqtype = keyof Request;
type schematype = Partial<Record<reqtype, ZodType>>;

export const validate = (schema: schematype) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const validatederrors = []
        for (const key of Object.keys(schema)) {
            const typedKey = key as reqtype;
            if (!schema[typedKey]) continue;

            if (req.file) {
                req.body.attachments = req.file
            }

            if (req.files) {
                console.log(req.files)
                req.body.attachments = req.files
            }

            const result = schema[typedKey].safeParse(req[typedKey]);
            if (!result.success) {
                validatederrors.push(result.error)

            }
        }

        if (validatederrors.length) {
            const errorMessages = validatederrors
                .map((err: any) => {
                    const issues = err.errors || err.issues || [];
                    return issues.map((e: any) => `${e.path.join(".")}: ${e.message}`);
                })
                .flat();
            throw new AppError(errorMessages.join(" | "), 400);
        }

        next()

    }
}