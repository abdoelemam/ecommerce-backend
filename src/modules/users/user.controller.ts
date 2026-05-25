import { Router } from "express";
import { validate } from "../../middleware/validation.js";
import { signupSchema, signinSchema, updateProfileSchema, changePasswordSchema, deleteAccountSchema, verifyEmailSchema, forgotPasswordSchema, resetPasswordSchema, resendOtpSchema } from "./user.validation.js";
import userService from "./user.service.js";
import { auth, authorize } from "../../middleware/auth.js";
import { Roletype } from "../../model/user.model.js";

const userRouter = Router();

// POST /users/signup
userRouter.post("/signup", validate(signupSchema), userService.signup);

// POST /users/verify-email
userRouter.post("/verify-email", validate(verifyEmailSchema), userService.verifyEmail);

// POST /users/resend-code
userRouter.post("/resend-code", validate(resendOtpSchema), userService.resendCode);

// POST /users/signin
userRouter.post("/signin", validate(signinSchema), userService.signin);

// POST /users/forgot-password
userRouter.post("/forgot-password", validate(forgotPasswordSchema), userService.forgotPassword);

// PATCH /users/reset-password
userRouter.patch("/reset-password", validate(resetPasswordSchema), userService.resetPassword);

// POST /users/refresh-token
userRouter.post("/refresh-token", userService.refreshToken);

// GET /users/profile (Protected)
userRouter.get("/profile", auth, userService.getProfile);

// PUT /users/profile (Protected)
userRouter.put("/profile", auth, validate(updateProfileSchema), userService.updateProfile);

// PATCH /users/change-password (Protected)
userRouter.patch("/change-password", auth, validate(changePasswordSchema), userService.changePassword);

// DELETE /users/delete-account (Protected)
userRouter.delete("/delete-account", auth, validate(deleteAccountSchema), userService.deleteAccount);

// ========== Admin Routes ==========

// GET /users (Admin Only)
userRouter.get("/", auth, authorize(Roletype.admin), userService.getAllUsers);

// PATCH /users/block/:id (Admin Only)
userRouter.patch("/block/:id", auth, authorize(Roletype.admin), userService.toggleBlockUser);

export default userRouter;
