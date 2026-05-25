import jwt, { JwtPayload } from "jsonwebtoken";

export enum Tokentype {
    access = "access",
    refresh = "refresh",
}

export const generateToken = async (payload: Object, signature: string, options?: jwt.SignOptions): Promise<string> => {
    return jwt.sign(payload, signature, options);
}

export const verifyToken = async (token: string, signature: string): Promise<JwtPayload> => {
    return jwt.verify(token, signature) as JwtPayload;
}

