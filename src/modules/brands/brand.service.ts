import { NextFunction, Request, Response } from "express";
import brandModel from "../../model/brand.model.js";
import AppError from "../../utils/AppError.js";
// import { uploadFile, deletefile } from "../../utils/s3.config.js";
import { uploadFileCloudinary, deleteFileCloudinary } from "../../utils/index.js";
import { AuthRequest } from "../../middleware/auth.js";

const generateSlug = (name: string): string => {
    return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
};

class BrandService {
    // [1] Create Brand (Admin Only)
    async createBrand(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { name } = req.body;
            const file = req.file;

            if (!file) {
                throw new AppError("Brand logo is required", 400);
            }

            const existingBrand = await brandModel.findOne({ name: name.trim() });
            if (existingBrand) {
                throw new AppError("Brand with this name already exists", 409);
            }

            const slug = generateSlug(name);

            // const s3Result = await uploadFile({
            //     file: file,
            //     path: "brands"
            // });
            const s3Result = await uploadFileCloudinary(file, "brands");

            const brand = await brandModel.create({
                name,
                slug,
                image: {
                    secure_url: s3Result.url,
                    key: s3Result.Key
                },
                createdBy: req.user?._id
            });

            return res.status(201).json({
                message: "Brand created successfully",
                data: { brand }
            });
        } catch (error) {
            next(error);
        }
    }

    // [2] Get All Brands
    async getBrands(req: Request, res: Response, next: NextFunction) {
        try {
            const brands = await brandModel.find().populate("createdBy", "username email");
            
            return res.status(200).json({
                message: "Brands fetched successfully",
                data: { brands }
            });
        } catch (error) {
            next(error);
        }
    }

    // [2.1] Get Brand by ID
    async getBrandById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            const brand = await brandModel.findById(id)
                .populate("createdBy", "username email");

            if (!brand) {
                throw new AppError("Brand not found", 404);
            }

            return res.status(200).json({
                message: "Brand fetched successfully",
                data: { brand }
            });
        } catch (error) {
            next(error);
        }
    }

    // [3] Update Brand (Admin Only)
    async updateBrand(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { name } = req.body;
            const file = req.file;

            const brand = await brandModel.findById(id);
            if (!brand) {
                throw new AppError("Brand not found", 404);
            }

            if (name && name !== brand.name) {
                const existingBrand = await brandModel.findOne({ name: name.trim() });
                if (existingBrand && existingBrand._id.toString() !== id) {
                    throw new AppError("Brand with this name already exists", 409);
                }
                brand.name = name;
                brand.slug = generateSlug(name);
            }

            if (file) {
                // const s3Result = await uploadFile({
                //     file: file,
                //     path: "brands"
                // });
                const s3Result = await uploadFileCloudinary(file, "brands");

                if (brand.image && brand.image.key) {
                    // deletefile({ key: brand.image.key }).catch(err => console.log('Failed to delete old S3 image', err));
                    deleteFileCloudinary(brand.image.key).catch(err => console.log('Failed to delete old Cloudinary image', err));
                }

                brand.image = {
                    secure_url: s3Result.url,
                    key: s3Result.Key
                };
            }

            await brand.save();

            return res.status(200).json({
                message: "Brand updated successfully",
                data: { brand }
            });
        } catch (error) {
            next(error);
        }
    }

    // [4] Delete Brand (Admin Only)
    async deleteBrand(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            const brand = await brandModel.findById(id);
            if (!brand) {
                throw new AppError("Brand not found", 404);
            }

            if (brand.image && brand.image.key) {
                // await deletefile({ key: brand.image.key });
                await deleteFileCloudinary(brand.image.key);
            }

            await brand.deleteOne();

            return res.status(200).json({
                message: "Brand deleted successfully"
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new BrandService();
