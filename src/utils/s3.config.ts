import { DeleteObjectCommand, DeleteObjectsCommand, GetObjectCommand, ListObjectsCommand, ListObjectsV2Command, ObjectCannedACL, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { Express } from "express"; // It's good practice to import the type
import { StorageEnum } from "../middleware/multer.js";
import { createReadStream } from "fs";
import { Upload } from "@aws-sdk/lib-storage";
import { string } from "zod";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import path from "path";

// s3Client function remains the same, it's correct.
export const s3Client = (): S3Client => {
    return new S3Client({
        region: process.env.AWS_REGION!,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
    });
};

// Interface for the function parameters for better readability
interface UploadFileParams {
    storageType?: StorageEnum;
    file: Express.Multer.File;
    Bucket?: string;
    path?: string;
    ACL?: ObjectCannedACL;
}

interface UploadFilesParams {
    storageType?: StorageEnum;
    files: Express.Multer.File[];
    Bucket?: string;
    path?: string;
    ACL?: ObjectCannedACL;
}

export const uploadFile = async ({
    // 1. Corrected function signature with default values.
    // This is the correct way to destructure and set defaults.
    storageType = StorageEnum.cloud,
    file,
    Bucket = process.env.BUCKET_NAME!,
    path = "general",
    ACL = 'private',
}: UploadFileParams) => {

    const fileName = uuidv4() + "-" + file.originalname.replace(/\s/g, '_');

    // 2. Using the 'path' parameter to construct the full Key.
    const Key = `${path}/${fileName}`;

    await s3Client().send(new PutObjectCommand({
        // 3. Using the 'Bucket' and 'ACL' parameters from the input.
        Bucket: Bucket,
        Key: Key,
        Body: storageType == StorageEnum.cloud ? file.buffer : createReadStream(file.path),
        ACL: ACL,
        ContentType: file.mimetype,
    }));

    // 4. Returning the file Key and URL for future use. This is a best practice.
    const fileUrl = `https://${Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${Key}`;

    return { Key, url: fileUrl };
}


export const largefileUpload = async ({
    // 1. Corrected function signature with default values.
    // This is the correct way to destructure and set defaults.
    storageType = StorageEnum.cloud,
    file,
    Bucket = process.env.BUCKET_NAME!,
    path = "general",
    ACL = 'private',
}: UploadFileParams) => {
    const fileName = uuidv4() + "-" + file.originalname.replace(/\s/g, '_');

    // 2. Using the 'path' parameter to construct the full Key.
    const Key = `${path}/${fileName}`;

    const upload = new Upload({
        client: s3Client() || new S3Client({}),
        params: {
            Bucket: Bucket,
            Key: Key,
            Body: storageType == StorageEnum.cloud ? file.buffer : createReadStream(file.path),
            ACL: ACL,
            ContentType: file.mimetype,
        },
    })


    upload.on("httpUploadProgress", (progress) => {
        console.log(progress);
    });

    const result = await upload.done();
    return result;
}


export const uploadFiles = async ({
    storageType = StorageEnum.cloud,
    files,
    Bucket = process.env.BUCKET_NAME!,
    path = "general",
    ACL = 'private'
}: UploadFilesParams) => {

    const Urls: string[] = [];
    await Promise.all(files.map(async (file) => {
        const key = await uploadFile({ storageType, file, Bucket, path: path, ACL });
        Urls.push(key.url);
    }));
    return Urls;
}


// get file

export const getFile = async ({
    Bucket = process.env.BUCKET_NAME!,
    key,
}: { Bucket?: string, key: string, }

) => {
    const command = new GetObjectCommand({
        Bucket,
        Key: key,
    });

    const response = await s3Client().send(command);
    return response;
}

// delete file
export const deletefile = async ({
    Bucket = process.env.BUCKET_NAME!,
    key,
}: { Bucket?: string, key: string, }

) => {
    const command = new DeleteObjectCommand({
        Bucket,
        Key: key,
    });

    const response = await s3Client().send(command);
    return response;
}

// delete files
export const deletefiles = async ({
    Bucket = process.env.BUCKET_NAME!,
    urls,
    Quiet = false,
}: { Bucket?: string, urls: string[], Quiet?: boolean, }

) => {
    const command = new DeleteObjectsCommand({
        Bucket,
        Delete: {
            Objects: urls.map((url) => ({ Key: url })),
            Quiet
        },
    });

    const response = await s3Client().send(command);
    return response;
}

// get list of files
export const listfiles = async ({
    Bucket = process.env.BUCKET_NAME!,
    path,
}: { Bucket?: string, path?: string, }

) => {
    const command = new ListObjectsV2Command({
        Bucket,
        Prefix: path,
    });

    const response = await s3Client().send(command);
    return response;
}

// 
export const createuploadPresignedUrl = async ({
    Bucket = process.env.BUCKET_NAME!,
    path = "allfiles",
    originalname,
    ContentType,
    expiresIn = 3600
}: { Bucket?: string, originalname: string, path?: string, ContentType?: string, expiresIn?: number, }

) => {



    const command = new PutObjectCommand({
        Bucket,
        Key: `${path}/${uuidv4()}_${originalname}`,
        ContentType,
    });

    const url = await getSignedUrl(s3Client(), command, { expiresIn });
    return url;
}


// export const uploadFiles = async ({
//     storageType = StorageEnum.cloud,
//     files,
//     Bucket = process.env.BUCKET_NAME!,
//     path = "general",
//     ACL = 'private'
//     } : UploadFilesParams )=>{

//     const Urls:  string[] = [];
//     for (const file of files) {
//     const  key =    await uploadFile({ storageType, file, Bucket, path:"allfiles", ACL });
//     Urls.push(key as any);
//     }

//     return Urls;
// }