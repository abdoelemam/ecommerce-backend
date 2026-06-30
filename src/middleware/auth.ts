import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import userModel, { IUser, Roletype } from "../model/user.model.js";
import AppError from "../utils/AppError.js";

// Extend the Request interface to include the user object correctly
export interface AuthRequest extends Request {
    user?: IUser;
}

export const auth = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { authorization } = req.headers;

        // 1. Check if token exists and starts with Bearer
        if (!authorization || !authorization.startsWith("Bearer ")) {
            throw new AppError("Please login to access this route", 401);
        }

        const token = authorization.split(" ")[1];
        if (!token) {
            throw new AppError("Invalid or missing token", 401);
        }

        // 2. Decode the token (without verifying signature yet) to get the role
        const decodedPayload = jwt.decode(token) as JwtPayload;
        if (!decodedPayload || !decodedPayload.role || !decodedPayload.id) {
            throw new AppError("Invalid token payload", 401);
        }

        // 3. Determine the correct signature based on the user's role
        const signature = decodedPayload.role === Roletype.admin
            ? process.env.access_signiture_admin!
            : process.env.access_signiture_user!;

        // 4. Verify the token with the correct signature
        let verified;
        try {
            verified = jwt.verify(token, signature) as JwtPayload;
        } catch (error: any) {
            if (error.name === "TokenExpiredError") {
                throw new AppError("Token expired, please refresh it", 401);
            }
            throw new AppError("Invalid token", 401);
        }

        // 5. Find the user in the database
        const user = await userModel.findById(verified.id);
        if (!user) {
            throw new AppError("User belonging to this token no longer exists", 401);
        }

        // 6. Check if user is blocked or deleted
        if (user.isBlocked) {
            throw new AppError("Your account has been blocked by admin", 403);
        }
        if (user.isDeleted) {
            throw new AppError("Account not found", 404);
        }

        // 7. Check if user changed password after the token was issued
        if (user.passwordChangedAt && verified.iat) {
            const changedTimestamp = Math.floor(user.passwordChangedAt.getTime() / 1000);
            if (changedTimestamp > verified.iat) {
                throw new AppError("User recently changed password. Please login again.", 401);
            }
        }

        // 8. Attach user to request header and proceed
        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
};

// ================= Authorization Middleware =================

// Use this AFTER the auth middleware
export const authorize = (...roles: Roletype[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new AppError("User not authenticated", 401));
        }

        if (!req.user.role || !roles.includes(req.user.role)) {
            return next(new AppError("You do not have permission to perform this action", 403));
        }

        next();
    };
};
