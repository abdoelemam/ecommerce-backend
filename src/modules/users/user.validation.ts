import { z } from "zod";
import { Gendertype, Roletype } from "../../model/user.model.js";


export const signupSchema = {
    body: z.object({
        username: z.string().min(3, "Username must be at least 3 characters"),
        email: z.string().email("Invalid email address"),
        password: z
            .string()
            .min(8, "Password must be at least 8 characters"),
        cpassword: z.string(),
        phone: z.string().min(10, "Phone must be at least 10 digits"),
        age: z.number().min(10).max(100).optional(),
        DOB: z.string().datetime().optional(),
        gender: z.nativeEnum(Gendertype),
        role: z.nativeEnum(Roletype).optional(),
    }).refine((data) => data.password === data.cpassword, {
        message: "Passwords don't match",
        path: ["cpassword"],
    }),
};

export const signinSchema = {
    body: z.object({
        email: z.string().email(),
        password: z.string(),
    }),
};

export const verifyEmailSchema = {
    body: z.object({
        email: z.string().email("Invalid email format"),
        otp: z.string().length(6, "OTP must be exactly 6 characters"),
    }),
};

export const resendOtpSchema = {
    body: z.object({
        email: z.string().email("Invalid email format"),
    }),
};

export const updateProfileSchema = {
    body: z.object({
        fname: z.string().min(2).max(20).optional(),
        lname: z.string().min(2).max(20).optional(),
        phone: z.string().min(10).optional(),
        age: z.number().min(10).max(100).optional(),
        DOB: z.string().datetime().optional(),
        gender: z.nativeEnum(Gendertype).optional(),
    }),
};

export const changePasswordSchema = {
    body: z.object({
        oldPassword: z.string(),
        newPassword: z.string().min(8, "New password must be at least 8 characters"),
        confirmNewPassword: z.string(),
    }).refine((data) => data.newPassword === data.confirmNewPassword, {
        message: "Passwords don't match",
        path: ["confirmNewPassword"],
    }),
};

export const deleteAccountSchema = {
    body: z.object({
        password: z.string(),
    }),
};

export const forgotPasswordSchema = {
    body: z.object({
        email: z.string().email("Invalid email format"),
    }),
};

export const resetPasswordSchema = {
    body: z.object({
        email: z.string().email("Invalid email format"),
        otp: z.string().length(6, "OTP must be exactly 6 characters"),
        newPassword: z.string().min(8, "New password must be at least 8 characters"),
    }),
};
