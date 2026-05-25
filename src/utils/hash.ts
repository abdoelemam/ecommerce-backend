import { compare, hash } from "bcrypt";

export const hashPassword = async (plaintext: string, salt: number = Number(process.env.SALT_ROUNDS)) => {
    return hash(plaintext, salt);
}

export const comparePassword = async (plaintext: string, cipertext: string) => {
    return compare(plaintext, cipertext);
}