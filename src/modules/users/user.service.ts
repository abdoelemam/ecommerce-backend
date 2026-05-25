import { NextFunction, Request, Response } from "express";
import userModel, { Roletype } from "../../model/user.model.js";
import { hashPassword, comparePassword } from "../../utils/hash.js";
import { generateToken, verifyToken, Tokentype } from "../../utils/token.js";
import AppError from "../../utils/AppError.js";
import { sendEmail } from "../../utils/sendEmail.js";

class UserService {

    async signup(req: Request, res: Response, next: NextFunction) {
        try {
            const { username, email, password, phone, age, DOB, gender } = req.body;

            // 1. Check if user already exists
            const existingUser = await userModel.findOne({ email });
            if (existingUser) {
                throw new AppError("Email already registered", 409);
            }

            // 2. Hash password
            const hashedPassword = await hashPassword(password);

            // 3. Split username into fname & lname
            const [fname, ...rest] = username.split(" ");
            const lname = rest.join(" ") || fname;

            // 4. Create user
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            const user = await userModel.create({
                fname,
                lname,
                email,
                password: hashedPassword,
                phone,
                age,
                DOB,
                gender,
                otp: otpCode,
                otpExpiry: otpExpiresAt,
            });

            // Send Email
            sendEmail({
                to: email,
                subject: "Verify your email - EcommercePro",
                html: `<h1>Welcome to EcommercePro!</h1> <p>Your OTP code is <strong>${otpCode}</strong>. It will expire in 10 minutes.</p>`
            }).catch(err => console.error("Failed to send OTP email:", err));

            // 5. Generate tokens
            const accessToken = await generateToken(
                { id: user._id, email: user.email, role: user.role },
                process.env.access_signiture_user!,
                { expiresIn: "1d" }
            );

            const refreshToken = await generateToken(
                { id: user._id, email: user.email },
                process.env.refresh_signiture_user!,
                { expiresIn: "7d" }
            );

            return res.status(201).json({
                message: "User registered successfully",
                data: {
                    user: {
                        _id: user._id,
                        username: user.username,
                        email: user.email,
                        role: user.role,
                    },
                    accessToken,
                    refreshToken,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async verifyEmail(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, otp } = req.body;

            const user = await userModel.findOne({ email });
            if (!user) {
                throw new AppError("User not found", 404);
            }

            if (user.isVerified) {
                throw new AppError("Email is already verified", 400);
            }

            if (!user.otp || user.otp !== otp) {
                throw new AppError("Invalid OTP code", 400);
            }

            if (user.otpExpiry && user.otpExpiry < new Date()) {
                throw new AppError("OTP code has expired", 400);
            }

            user.isVerified = true;
            user.otp = undefined;
            user.otpExpiry = undefined;
            await user.save();

            // Generate tokens so the user is logged in immediately after varying email
            const accessSignature = user.role === Roletype.admin
                ? process.env.access_signiture_admin!
                : process.env.access_signiture_user!;

            const refreshSignature = user.role === Roletype.admin
                ? process.env.refresh_signiture_admin!
                : process.env.refresh_signiture_user!;

            const accessToken = await generateToken(
                { id: user._id, email: user.email, role: user.role },
                accessSignature,
                { expiresIn: "1d" }
            );

            const refreshToken = await generateToken(
                { id: user._id, email: user.email },
                refreshSignature,
                { expiresIn: "7d" }
            );

            return res.status(200).json({
                message: "Email verified successfully. You are now logged in.",
                data: {
                    user: {
                        _id: user._id,
                        username: user.username,
                        email: user.email,
                        role: user.role,
                    },
                    accessToken,
                    refreshToken,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async resendCode(req: Request, res: Response, next: NextFunction) {
        try {
            const { email } = req.body;
            const user = await userModel.findOne({ email });

            if (!user) {
                throw new AppError("Account not found", 404);
            }
            if (user.isVerified) {
                throw new AppError("Account is already verified", 400);
            }

            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

            user.otp = otpCode;
            user.otpExpiry = otpExpiresAt;
            await user.save();

            sendEmail({
                to: email,
                subject: "Your New Verification Code - EcommercePro",
                html: `<h1>Verification Code</h1> <p>Your new OTP code is <strong>${otpCode}</strong>. It will expire in 10 minutes.</p>`
            }).catch(err => console.error("Failed to send Resend OTP email:", err));

            return res.status(200).json({
                message: "A new verification code has been sent to your email",
            });
        } catch (error) {
            next(error);
        }
    }

    async signin(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password } = req.body;

            // 1. Find user by email
            const user = await userModel.findOne({ email });
            if (!user) {
                throw new AppError("Invalid email or password", 401);
            }

            // 2. Check if user is blocked or deleted
            if (!user.isVerified) {
                throw new AppError("Please verify your email first. An OTP was sent to your email.", 403);
            }
            if (user.isBlocked) {
                throw new AppError("Your account has been blocked", 403);
            }
            if (user.isDeleted) {
                throw new AppError("Account not found", 404);
            }

            // 3. Compare password
            const isMatch = await comparePassword(password, user.password);
            if (!isMatch) {
                throw new AppError("Invalid email or password", 401);
            }

            // 4. Pick the right signature based on role
            const accessSignature = user.role === Roletype.admin
                ? process.env.access_signiture_admin!
                : process.env.access_signiture_user!;

            const refreshSignature = user.role === Roletype.admin
                ? process.env.refresh_signiture_admin!
                : process.env.refresh_signiture_user!;

            // 5. Generate tokens
            const accessToken = await generateToken(
                { id: user._id, email: user.email, role: user.role },
                accessSignature,
                { expiresIn: "1d" }
            );

            const refreshToken = await generateToken(
                { id: user._id, email: user.email },
                refreshSignature,
                { expiresIn: "7d" }
            );

            return res.status(200).json({
                message: "Logged in successfully",
                data: {
                    user: {
                        _id: user._id,
                        username: user.username,
                        email: user.email,
                        role: user.role,
                    },
                    accessToken,
                    refreshToken,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async refreshToken(req: Request, res: Response, next: NextFunction) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                throw new AppError("Refresh token is required", 400);
            }

            // 1. Try to verify with user signature first, then admin
            let decoded;
            let isAdmin = false;

            try {
                decoded = await verifyToken(refreshToken, process.env.refresh_signiture_admin!);
                isAdmin = true;
            } catch {
                decoded = await verifyToken(refreshToken, process.env.refresh_signiture_user!);
            }

            // 2. Check if user still exists
            const user = await userModel.findById(decoded.id);
            if (!user) {
                throw new AppError("User no longer exists", 401);
            }

            if (user.isBlocked) {
                throw new AppError("Your account has been blocked", 403);
            }
            if (user.isDeleted) {
                throw new AppError("Account not found", 404);
            }

            // 3. Check if password was changed after token was issued
            if (user.passwordChangedAt && decoded.iat) {
                const changedAt = Math.floor(user.passwordChangedAt.getTime() / 1000);
                if (changedAt > decoded.iat) {
                    throw new AppError("Password was changed, please login again", 401);
                }
            }

            // 4. Generate new access token
            const accessSignature = isAdmin
                ? process.env.access_signiture_admin!
                : process.env.access_signiture_user!;

            const newAccessToken = await generateToken(
                { id: user._id, email: user.email, role: user.role },
                accessSignature,
                { expiresIn: "1d" }
            );

            return res.status(200).json({
                message: "Token refreshed successfully",
                data: {
                    accessToken: newAccessToken,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async getProfile(req: Request, res: Response, next: NextFunction) {
        try {
            // req.user is set by the auth middleware!
            // We use type casting here or use the AuthRequest interface we created
            const user = (req as any).user;
            
            return res.status(200).json({
                message: "Profile fetched successfully",
                data: {
                    user: {
                        _id: user._id,
                        username: user.username,
                        email: user.email,
                        phone: user.phone,
                        gender: user.gender,
                        role: user.role,
                        addresses: user.addresses,
                        createdAt: user.createdAt
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async updateProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const user = (req as any).user;
            const { fname, lname, phone, age, DOB, gender } = req.body;

            if (fname) user.fname = fname;
            if (lname) user.lname = lname;
            if (phone) user.phone = phone;
            if (age !== undefined) user.age = age;
            if (DOB) user.DOB = DOB;
            if (gender) user.gender = gender;

            await user.save();

            return res.status(200).json({
                message: "Profile updated successfully",
                data: {
                    user: {
                        _id: user._id,
                        username: user.username,
                        email: user.email,
                        phone: user.phone,
                        gender: user.gender,
                        age: user.age,
                        role: user.role,
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async changePassword(req: Request, res: Response, next: NextFunction) {
        try {
            const user = (req as any).user;
            const { oldPassword, newPassword } = req.body;

            // 1. Verify old password
            const isMatch = await comparePassword(oldPassword, user.password);
            if (!isMatch) {
                throw new AppError("Current password is incorrect", 401);
            }

            // 2. Hash new password
            user.password = await hashPassword(newPassword);

            // 3. Set passwordChangedAt (invalidates old tokens)
            user.passwordChangedAt = new Date();

            await user.save();

            // 4. Generate new tokens
            const accessSignature = user.role === Roletype.admin
                ? process.env.access_signiture_admin!
                : process.env.access_signiture_user!;

            const refreshSignature = user.role === Roletype.admin
                ? process.env.refresh_signiture_admin!
                : process.env.refresh_signiture_user!;

            const accessToken = await generateToken(
                { id: user._id, email: user.email, role: user.role },
                accessSignature,
                { expiresIn: "1d" }
            );

            const refreshToken = await generateToken(
                { id: user._id, email: user.email },
                refreshSignature,
                { expiresIn: "7d" }
            );

            return res.status(200).json({
                message: "Password changed successfully",
                data: { accessToken, refreshToken }
            });
        } catch (error) {
            next(error);
        }
    }

    async forgotPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const { email } = req.body;
            const user = await userModel.findOne({ email });
            
            if (!user || user.isDeleted) {
                throw new AppError("Account not found", 404);
            }

            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            user.otp = otpCode;
            user.otpExpiry = otpExpiresAt;
            await user.save();

            sendEmail({
                to: email,
                subject: "Reset your password - EcommercePro",
                html: `<h1>Reset Password</h1> <p>Your OTP code to reset your password is <strong>${otpCode}</strong>. It will expire in 10 minutes.</p>`
            }).catch(err => console.error("Failed to send Forgot Password email:", err));

            return res.status(200).json({
                message: "Password reset OTP sent to email",
            });
        } catch (error) {
            next(error);
        }
    }

    async resetPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, otp, newPassword } = req.body;

            const user = await userModel.findOne({ email });
            if (!user || user.isDeleted) {
                throw new AppError("Account not found", 404);
            }

            if (!user.otp || user.otp !== otp) {
                throw new AppError("Invalid OTP code", 400);
            }

            if (user.otpExpiry && user.otpExpiry < new Date()) {
                throw new AppError("OTP code has expired", 400);
            }

            user.password = await hashPassword(newPassword);
            user.passwordChangedAt = new Date();
            user.otp = undefined;
            user.otpExpiry = undefined;
            await user.save();

            return res.status(200).json({
                message: "Password reset successfully. You can now login with your new password.",
            });
        } catch (error) {
            next(error);
        }
    }

    async deleteAccount(req: Request, res: Response, next: NextFunction) {
        try {
            const user = (req as any).user;
            const { password } = req.body;

            // Verify password before deleting
            const isMatch = await comparePassword(password, user.password);
            if (!isMatch) {
                throw new AppError("Password is incorrect", 401);
            }

            // Soft delete
            user.isDeleted = true;
            await user.save();

            return res.status(200).json({
                message: "Account deleted successfully"
            });
        } catch (error) {
            next(error);
        }
    }
    // ========== Admin Endpoints ==========

    async getAllUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const { search, page = "1", limit = "10" } = req.query as Record<string, string>;

            const pageNum = Math.max(parseInt(page), 1);
            const limitNum = Math.max(parseInt(limit), 1);
            const skip = (pageNum - 1) * limitNum;

            const filter: Record<string, any> = { isDeleted: false };
            if (search) {
                filter.$or = [
                    { fname: { $regex: search, $options: "i" } },
                    { lname: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                ];
            }

            const [users, totalCount] = await Promise.all([
                userModel.find(filter)
                    .select("-password -otp -otpExpiry")
                    .sort("-createdAt")
                    .skip(skip)
                    .limit(limitNum),
                userModel.countDocuments(filter),
            ]);

            const totalPages = Math.ceil(totalCount / limitNum);

            return res.status(200).json({
                message: "Users fetched successfully",
                data: {
                    users,
                    pagination: {
                        currentPage: pageNum,
                        totalPages,
                        totalCount,
                        limit: limitNum,
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async toggleBlockUser(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const user = await userModel.findById(id);

            if (!user || user.isDeleted) {
                throw new AppError("User not found", 404);
            }

            if (user.role === Roletype.admin) {
                throw new AppError("Cannot block another admin", 403);
            }

            user.isBlocked = !user.isBlocked;
            await user.save();

            return res.status(200).json({
                message: `User ${user.isBlocked ? "blocked" : "unblocked"} successfully`,
                data: { user: { _id: user._id, isBlocked: user.isBlocked } }
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new UserService();