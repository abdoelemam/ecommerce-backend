import express, { Request } from "express";
import multer from "multer";
import { v4 as uuidv4 } from 'uuid';
import os from "os";
import AppError from "../utils/AppError.js";


export const filevalidation = {
    image: ["image/jpeg", "image/png", "image/jpg", "image/webp", "image/avif", "image/svg+xml"],
    video: ["video/mp4", "video/quicktime", "video/mkv"],
    audio: ["audio/mpeg", "audio/wav"],
    pdf: ["application/pdf"]
}

export enum StorageEnum {
    disk = "disk",
    cloud = "cloud",
}

export const MulterHost = ({ filetypes = filevalidation.image, storageType = StorageEnum.cloud }: { filetypes?: string[], storageType?: StorageEnum }) => {

    const storage = storageType === StorageEnum.cloud ? multer.memoryStorage() : multer.diskStorage({
        destination: os.tmpdir(),
        filename: (req: Request, file: Express.Multer.File, cb) => {
            cb(null, uuidv4() + file.originalname);
        }
    })

    function fileFilter(req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
        // The function should call `cb` with a boolean
        // to indicate if the file should be accepted
        console.log(filetypes)
        if (filetypes.includes(file.mimetype)) {
            return cb(null, true)
        }
        else {
            return cb(new AppError('file type is not allowed') as any, false);
        }

        // cb(new Error('I don\'t have a clue!'))

    }

    const upload = multer({ storage: storage, fileFilter })
    console.log(upload)
    return upload
}