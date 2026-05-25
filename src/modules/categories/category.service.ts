import { NextFunction, Request, Response } from "express";
import categoryModel from "../../model/category.model.js";
import AppError from "../../utils/AppError.js";
// import { uploadFile, deletefile } from "../../utils/s3.config.js";
import { uploadFileCloudinary, deleteFileCloudinary } from "../../utils/index.js";
import { AuthRequest } from "../../middleware/auth.js";

// Helper function to create a slug from name
const generateSlug = (name: string): string => {
    return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
};

class CategoryService {
    // [1] Create Category (Admin Only)
    async createCategory(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { name, parentId } = req.body;
            const file = req.file;



            // Check if category already exists
            const existingCategory = await categoryModel.findOne({ name: name.trim() });
            if (existingCategory) {
                throw new AppError("Category with this name already exists", 409);
            }

            // Check if parent category exists if parentId is provided
            if (parentId) {
                const parentExists = await categoryModel.findById(parentId);
                if (!parentExists) {
                    throw new AppError("Parent category not found", 404);
                }
            }

            // Generate slug
            const slug = generateSlug(name);

            // Upload image to S3 if provided
            let image = undefined;
            if (file) {
                // const s3Result = await uploadFile({
                //     file: file,
                //     path: "categories"
                // });
                const s3Result = await uploadFileCloudinary(file, "categories");
                image = {
                    secure_url: s3Result.url,
                    key: s3Result.Key
                };
            }

            // Create category in DB
            const category = await categoryModel.create({
                name,
                slug,
                image,
                parentId: parentId || null,
                createdBy: req.user?._id
            });

            return res.status(201).json({
                message: "Category created successfully",
                data: {
                    category
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // [2] Get All Categories
    async getCategories(req: Request, res: Response, next: NextFunction) {
        try {
            const categories = await categoryModel.find()
                .populate("createdBy", "username email")
                .populate("parentId", "name slug");
            
            return res.status(200).json({
                message: "Categories fetched successfully",
                data: {
                    categories
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // [2.1] Get Category by ID
    async getCategoryById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            const category = await categoryModel.findById(id)
                .populate("createdBy", "username email")
                .populate("parentId", "name slug");

            if (!category) {
                throw new AppError("Category not found", 404);
            }

            return res.status(200).json({
                message: "Category fetched successfully",
                data: { category }
            });
        } catch (error) {
            next(error);
        }
    }

    // [2.2] Get Subcategories of a Category
    async getSubcategories(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            // Check parent exists
            const parentCategory = await categoryModel.findById(id);
            if (!parentCategory) {
                throw new AppError("Category not found", 404);
            }

            const subcategories = await categoryModel.find({ parentId: id })
                .populate("createdBy", "username email");

            return res.status(200).json({
                message: "Subcategories fetched successfully",
                data: { subcategories }
            });
        } catch (error) {
            next(error);
        }
    }

    // [3] Update Category (Admin Only)
    async updateCategory(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { name, parentId } = req.body;
            const file = req.file;

            const category = await categoryModel.findById(id);
            if (!category) {
                throw new AppError("Category not found", 404);
            }

            // Update Name
            if (name && name !== category.name) {
                const existingCategory = await categoryModel.findOne({ name: name.trim() });
                if (existingCategory && existingCategory._id.toString() !== id) {
                    throw new AppError("Category with this name already exists", 409);
                }
                category.name = name;
                category.slug = generateSlug(name);
            }

            // Update Parent
            if (parentId !== undefined) {
                if (parentId === id) {
                    throw new AppError("Category cannot be its own parent", 400);
                }
                if (parentId) {
                    const parentExists = await categoryModel.findById(parentId);
                    if (!parentExists) {
                        throw new AppError("Parent category not found", 404);
                    }
                    category.parentId = parentId;
                } else {
                    category.parentId = null; // Unset parent
                }
            }

            // Update Image
            if (file) {
                // Upload new image
                // const s3Result = await uploadFile({
                //     file: file,
                //     path: "categories"
                // });
                const s3Result = await uploadFileCloudinary(file, "categories");

                // Delete old image from S3 (run in background, no need to wait or block)
                if (category.image && category.image.key) {
                    // deletefile({ key: category.image.key }).catch(err => console.log('Failed to delete old S3 image', err));
                    deleteFileCloudinary(category.image.key).catch(err => console.log('Failed to delete old Cloudinary image', err));
                }

                category.image = {
                    secure_url: s3Result.url,
                    key: s3Result.Key
                };
            }

            await category.save();

            return res.status(200).json({
                message: "Category updated successfully",
                data: {
                    category
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // [4] Delete Category (Admin Only)
    async deleteCategory(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            const category = await categoryModel.findById(id);
            if (!category) {
                throw new AppError("Category not found", 404);
            }

            // Delete image from S3
            if (category.image && category.image.key) {
                // await deletefile({ key: category.image.key });
                await deleteFileCloudinary(category.image.key);
            }

            // Delete from DB
            await category.deleteOne();

            return res.status(200).json({
                message: "Category deleted successfully"
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new CategoryService();
