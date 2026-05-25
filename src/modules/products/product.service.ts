import { NextFunction, Request, Response } from "express";
import productModel from "../../model/product.model.js";
import categoryModel from "../../model/category.model.js";
import brandModel from "../../model/brand.model.js";
import AppError from "../../utils/AppError.js";
// import { uploadFile, deletefile } from "../../utils/s3.config.js";
import { uploadFileCloudinary, deleteFileCloudinary } from "../../utils/index.js";
import { AuthRequest } from "../../middleware/auth.js";


const generateSlug = (name: string): string => {
    return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
};

// Helper: Get all child category IDs recursively (for category tree search)
const getAllChildCategoryIds = async (parentId: string): Promise<string[]> => {
    const ids: string[] = [parentId];
    const children = await categoryModel.find({ parentId });
    for (const child of children) {
        const childIds = await getAllChildCategoryIds(child._id.toString());
        ids.push(...childIds);
    }
    return ids;
};

class ProductService {
    // [1] Create Product (Admin Only)
    async createProduct(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { name, description, price, discount, variants, categoryId, brandId, colorImageMapping } = req.body;
            const files = req.files as Express.Multer.File[];

            if (!files || files.length === 0) {
                throw new AppError("At least one product image is required", 400);
            }

            const existingProduct = await productModel.findOne({ name: name.trim() });
            if (existingProduct) {
                throw new AppError("Product with this name already exists", 409);
            }

            // Verify Category
            const categoryExists = await categoryModel.findById(categoryId);
            if (!categoryExists) {
                throw new AppError("Category not found", 404);
            }

            // Verify Brand
            if (brandId) {
                const brandExists = await brandModel.findById(brandId);
                if (!brandExists) {
                    throw new AppError("Brand not found", 404);
                }
            }

            const slug = generateSlug(name);

            // Upload all images to Cloudinary
            const uploadedImages = [];
            for (const file of files) {
                const s3Result = await uploadFileCloudinary(file, `products/${slug}`);
                uploadedImages.push({
                    secure_url: s3Result.url,
                    key: s3Result.Key
                });
            }

            // Parse Variants
            let parsedVariants = [{ stock: 1, color: "N/A", size: "N/A", priceDiff: 0, images: [] as any[] }];
            if (variants) {
                if (typeof variants === 'string') {
                    try { parsedVariants = JSON.parse(variants); } catch (e) { /* ignore parse error */ }
                } else if (Array.isArray(variants)) {
                    parsedVariants = variants;
                }
            }

            // Parse colorImageMapping: { "Red": [0, 1, 2], "Blue": [3, 4] }
            let mapping: Record<string, number[]> | null = null;
            if (colorImageMapping) {
                if (typeof colorImageMapping === 'string') {
                    try { mapping = JSON.parse(colorImageMapping); } catch (e) { /* ignore */ }
                } else {
                    mapping = colorImageMapping;
                }
            }

            // Distribute images to variants by color
            if (mapping) {
                for (const variant of parsedVariants) {
                    const colorKey = variant.color?.trim();
                    if (colorKey && mapping[colorKey]) {
                        variant.images = mapping[colorKey]
                            .filter((idx: number) => idx < uploadedImages.length)
                            .map((idx: number) => uploadedImages[idx]);
                    }
                }
            }

            const product = await productModel.create({
                name,
                slug,
                description,
                price,
                discount: discount || 0,
                variants: parsedVariants,
                images: uploadedImages, // Keep all images at product level as fallback
                categoryId,
                brandId,
                createdBy: req.user?._id
            });

            return res.status(201).json({
                message: "Product created successfully",
                data: { product }
            });
        } catch (error) {
            next(error);
        }
    }

    // [2] Get All Products (with Pagination, Search, Sort, Filter by Category Tree & Brand)
    async getProducts(req: Request, res: Response, next: NextFunction) {
        try {
            const {
                page = "1",
                limit = "10",
                sort = "-createdAt",
                search,
                categoryId,
                brandId,
                minPrice,
                maxPrice,
            } = req.query as Record<string, string>;

            const pageNum = Math.max(parseInt(page), 1);
            const limitNum = Math.max(parseInt(limit), 1);
            const skip = (pageNum - 1) * limitNum;

            // Build filter object
            const filter: Record<string, any> = {};

            // Search by name
            if (search) {
                filter.name = { $regex: search, $options: "i" };
            }

            // Filter by Category (recursively includes all subcategories)
            if (categoryId) {
                const allCategoryIds = await getAllChildCategoryIds(categoryId);
                filter.categoryId = { $in: allCategoryIds };
            }

            // Filter by Brand
            if (brandId) {
                filter.brandId = brandId;
            }

            // Filter by Price Range
            if (minPrice || maxPrice) {
                filter.finalPrice = {};
                if (minPrice) filter.finalPrice.$gte = Number(minPrice);
                if (maxPrice) filter.finalPrice.$lte = Number(maxPrice);
            }

            const [products, totalCount] = await Promise.all([
                productModel.find(filter)
                    .populate("categoryId", "name slug")
                    .populate("brandId", "name slug")
                    .populate("createdBy", "username email")
                    .sort(sort)
                    .skip(skip)
                    .limit(limitNum),
                productModel.countDocuments(filter)
            ]);

            const totalPages = Math.ceil(totalCount / limitNum);

            return res.status(200).json({
                message: "Products fetched successfully",
                data: {
                    products,
                    pagination: {
                        currentPage: pageNum,
                        totalPages,
                        totalCount,
                        limit: limitNum,
                        hasNextPage: pageNum < totalPages,
                        hasPrevPage: pageNum > 1,
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // [3] Get Single Product by ID
    async getProductById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            const product = await productModel.findById(id)
                .populate("categoryId", "name slug")
                .populate("brandId", "name slug")
                .populate("createdBy", "username email");

            if (!product) {
                throw new AppError("Product not found", 404);
            }

            return res.status(200).json({
                message: "Product fetched successfully",
                data: { product }
            });
        } catch (error) {
            next(error);
        }
    }

    // [3] Update Product (Admin Only)
    async updateProduct(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { name, description, price, discount, variants, categoryId, brandId, colorImageMapping } = req.body;
            const files = req.files as Express.Multer.File[];

            const product = await productModel.findById(id);
            if (!product) {
                throw new AppError("Product not found", 404);
            }

            if (name && name !== product.name) {
                const existingProduct = await productModel.findOne({ name: name.trim() });
                if (existingProduct && existingProduct._id.toString() !== id) {
                    throw new AppError("Product with this name already exists", 409);
                }
                product.name = name;
                product.slug = generateSlug(name);
            }

            if (description !== undefined) product.description = description;
            if (price !== undefined) product.price = price;
            if (discount !== undefined) product.discount = discount;
            
            if (variants !== undefined) {
                let parsedVariants;
                if (typeof variants === 'string') {
                    try { parsedVariants = JSON.parse(variants); } catch (e) { /* ignore parse error */ }
                } else if (Array.isArray(variants)) {
                    parsedVariants = variants;
                }
                if (parsedVariants) {
                    product.variants = parsedVariants;
                }
            }

            if (categoryId) {
                const categoryExists = await categoryModel.findById(categoryId);
                if (!categoryExists) throw new AppError("Category not found", 404);
                product.categoryId = categoryId;
            }

            if (brandId) {
                const brandExists = await brandModel.findById(brandId);
                if (!brandExists) throw new AppError("Brand not found", 404);
                product.brandId = brandId;
            }

            // Update Images if new ones are uploaded
            if (files && files.length > 0) {
                // Delete old product-level images from Cloudinary
                for (const oldImage of product.images) {
                    deleteFileCloudinary(oldImage.key).catch(err => console.log('Failed to delete old Cloudinary image', err));
                }
                // Delete old variant-level images from Cloudinary
                for (const variant of product.variants) {
                    if (variant.images) {
                        for (const img of variant.images) {
                            deleteFileCloudinary(img.key).catch(err => console.log('Failed to delete old variant image', err));
                        }
                    }
                }

                const uploadedImages = [];
                for (const file of files) {
                    const s3Result = await uploadFileCloudinary(file, `products/${product.slug}`);
                    uploadedImages.push({
                        secure_url: s3Result.url,
                        key: s3Result.Key
                    });
                }
                product.images = uploadedImages;

                // Parse and apply colorImageMapping
                let mapping: Record<string, number[]> | null = null;
                if (colorImageMapping) {
                    if (typeof colorImageMapping === 'string') {
                        try { mapping = JSON.parse(colorImageMapping); } catch (e) { /* ignore */ }
                    } else {
                        mapping = colorImageMapping;
                    }
                }

                if (mapping) {
                    for (const variant of product.variants) {
                        const colorKey = variant.color?.trim();
                        if (colorKey && mapping[colorKey]) {
                            variant.images = mapping[colorKey]
                                .filter((idx: number) => idx < uploadedImages.length)
                                .map((idx: number) => uploadedImages[idx]);
                        } else {
                            variant.images = [];
                        }
                    }
                }
            }

            await product.save();

            return res.status(200).json({
                message: "Product updated successfully",
                data: { product }
            });
        } catch (error) {
            next(error);
        }
    }

    // [4] Delete Product (Admin Only)
    async deleteProduct(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            const product = await productModel.findById(id);
            if (!product) {
                throw new AppError("Product not found", 404);
            }

            // Delete images from S3
            if (product.images && product.images.length > 0) {
                for (const image of product.images) {
                    // await deletefile({ key: image.key }).catch(err => console.log('Failed to delete S3 image', err));
                    await deleteFileCloudinary(image.key).catch(err => console.log('Failed to delete Cloudinary image', err));
                }
            }

            await product.deleteOne();

            return res.status(200).json({
                message: "Product deleted successfully"
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new ProductService();
