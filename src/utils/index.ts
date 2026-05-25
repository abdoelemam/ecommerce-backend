import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
    cloud_name: 'duhum1zna',
    api_key: '238483654863626',
    api_secret: 'w-xLJHF0Rg-VbtXXJ488ALDFWRE'
});

export const uploadFileCloudinary = async (file: Express.Multer.File, pathName: string): Promise<{ url: string, Key: string }> => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: pathName },
            (error, result) => {
                if (result) {
                    resolve({ url: result.secure_url, Key: result.public_id });
                } else {
                    reject(error);
                }
            }
        );
        stream.end(file.buffer);
    });
};

export const deleteFileCloudinary = async (public_id: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(public_id, (error, result) => {
            if (result) {
                resolve(result);
            } else {
                reject(error);
            }
        });
    });
};

export default cloudinary
