import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
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
            const { name, description, price, discount, variants, categoryId, brandId, colorImageMapping, attributes } = req.body;
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
                attributes: attributes ? (typeof attributes === 'string' ? JSON.parse(attributes) : attributes) : {},
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
            const { name, description, price, discount, variants, categoryId, brandId, colorImageMapping, attributes } = req.body;
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

            // Update dynamic attributes
            if (attributes !== undefined) {
                let parsedAttrs = attributes;
                if (typeof attributes === 'string') {
                    try { parsedAttrs = JSON.parse(attributes); } catch (e) { /* ignore */ }
                }
                if (parsedAttrs && typeof parsedAttrs === 'object') {
                    product.attributes = parsedAttrs instanceof Map ? parsedAttrs : new Map(Object.entries(parsedAttrs));
                }
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

    // [5] Get Products with Dynamic Faceted Filters
    async getProductsWithFilters(req: Request, res: Response, next: NextFunction) {
        try {
            const {
                page = "1",
                limit = "20",
                sort = "-createdAt",
                search,
                categoryId,
                brandId,
                minPrice,
                maxPrice,
                color,
                size,
                attrs,
            } = req.query as Record<string, string>;

            const pageNum = Math.max(parseInt(page), 1);
            const limitNum = Math.max(parseInt(limit), 1);
            const skip = (pageNum - 1) * limitNum;

            // Build filter object
            const filter: Record<string, any> = {};

            if (search) {
                // 1. Find matching brands
                const matchingBrands = await brandModel.find({ name: { $regex: search, $options: "i" } }, '_id');
                const searchBrandIds = matchingBrands.map(b => b._id);

                // 2. Find matching categories
                const matchingCategories = await categoryModel.find({ name: { $regex: search, $options: "i" } }, '_id');
                const searchCategoryIds = matchingCategories.map(c => c._id);

                filter.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { description: { $regex: search, $options: "i" } },
                ];

                if (searchBrandIds.length > 0) {
                    filter.$or.push({ brandId: { $in: searchBrandIds } });
                }
                
                if (searchCategoryIds.length > 0) {
                    filter.$or.push({ categoryId: { $in: searchCategoryIds } });
                }
            }

            if (categoryId) {
                const allCategoryIds = await getAllChildCategoryIds(categoryId);
                filter.categoryId = { $in: allCategoryIds.map(id => new mongoose.Types.ObjectId(id)) };
            }

            if (brandId) {
                // Support comma-separated brand IDs
                const brandIds = brandId.split(',').filter(Boolean);
                if (brandIds.length === 1) {
                    filter.brandId = new mongoose.Types.ObjectId(brandIds[0]);
                } else if (brandIds.length > 1) {
                    filter.brandId = { $in: brandIds.map(id => new mongoose.Types.ObjectId(id)) };
                }
            }

            if (minPrice || maxPrice) {
                filter.finalPrice = {};
                if (minPrice) filter.finalPrice.$gte = Number(minPrice);
                if (maxPrice) filter.finalPrice.$lte = Number(maxPrice);
            }

            // Filter by variant color
            if (color) {
                const colors = color.split(',');
                filter['variants.color'] = { $in: colors };
            }

            // Filter by variant size
            if (size) {
                const sizes = size.split(',');
                filter['variants.size'] = { $in: sizes };
            }

            // Filter by dynamic attributes
            if (attrs) {
                try {
                    const parsedAttrs = JSON.parse(attrs);
                    for (const [key, value] of Object.entries(parsedAttrs)) {
                        if (Array.isArray(value)) {
                            filter[`attributes.${key}`] = { $in: value };
                        } else {
                            filter[`attributes.${key}`] = value;
                        }
                    }
                } catch (e) {
                    // ignore invalid attrs JSON
                }
            }

            // Fetch products
            const [products, totalCount] = await Promise.all([
                productModel.find(filter)
                    .populate("categoryId", "name slug")
                    .populate("brandId", "name slug")
                    .sort(sort)
                    .skip(skip)
                    .limit(limitNum),
                productModel.countDocuments(filter)
            ]);

            const totalPages = Math.ceil(totalCount / limitNum);

            // ── Cross-Filtering (Disjunctive Faceting) ──────────────────
            // For each facet, use the full filter MINUS that facet's own key.
            // e.g. Color facet uses all filters except 'variants.color'
            //      Brand facet uses all filters except 'brandId'
            // This way the user can still see all options within a facet they're filtering on.
            const filterWithout = (keysToRemove: string[]): Record<string, any> => {
                const f = { ...filter };
                keysToRemove.forEach(k => delete f[k]);
                return f;
            };

            const colorBaseFilter = filterWithout(['variants.color']);
            const sizeBaseFilter = filterWithout(['variants.size']);
            const priceBaseFilter = filterWithout(['finalPrice']);
            const brandBaseFilter = filterWithout(['brandId']);
            // For dynamic attributes, remove all attribute.* keys
            const attrBaseFilter = Object.fromEntries(
                Object.entries(filter).filter(([k]) => !k.startsWith('attributes.'))
            );

            const [colorAgg, sizeAgg, priceAgg, brandAgg, attrAgg] = await Promise.all([
                // Unique colors (filtered by everything EXCEPT color)
                productModel.aggregate([
                    { $match: colorBaseFilter },
                    { $unwind: { path: "$variants", preserveNullAndEmptyArrays: false } },
                    { $match: { 
                        "variants.color": { $exists: true, $ne: null, $nin: ["", "N/A"] } 
                    } },
                    { $group: { _id: { $trim: { input: "$variants.color" } } } },
                    { $match: { _id: { $ne: "" } } },
                    { $sort: { _id: 1 } },
                ]),
                // Unique sizes (filtered by everything EXCEPT size)
                productModel.aggregate([
                    { $match: sizeBaseFilter },
                    { $unwind: { path: "$variants", preserveNullAndEmptyArrays: false } },
                    { $match: { 
                        "variants.size": { $exists: true, $ne: null, $nin: ["", "N/A"] } 
                    } },
                    { $group: { _id: { $trim: { input: "$variants.size" } } } },
                    { $match: { _id: { $ne: "" } } },
                    { $sort: { _id: 1 } },
                ]),
                // Price range (filtered by everything EXCEPT price)
                productModel.aggregate([
                    { $match: priceBaseFilter },
                    { $group: { _id: null, min: { $min: "$finalPrice" }, max: { $max: "$finalPrice" } } },
                ]),
                // Brands with count (filtered by everything EXCEPT brand)
                productModel.aggregate([
                    { $match: { ...brandBaseFilter, brandId: { $exists: true, $ne: null } } },
                    { $group: { _id: "$brandId", count: { $sum: 1 } } },
                    { $lookup: { from: "brands", localField: "_id", foreignField: "_id", as: "brand" } },
                    { $unwind: "$brand" },
                    { $project: { _id: 1, name: "$brand.name", count: 1 } },
                    { $sort: { count: -1 } },
                ]),
                // Dynamic attributes (filtered by everything EXCEPT attributes)
                productModel.aggregate([
                    { $match: attrBaseFilter },
                    { $project: { attrs: { $objectToArray: "$attributes" } } },
                    { $unwind: { path: "$attrs", preserveNullAndEmptyArrays: false } },
                    { $match: { "attrs.v": { $ne: null, $ne: "" } } },
                    { $group: { _id: "$attrs.k", values: { $addToSet: "$attrs.v" } } },
                    { $sort: { _id: 1 } },
                ]),
            ]);

            const filters = {
                colors: colorAgg.map((c: any) => c._id).filter((v: string) => v && v.trim() !== ""),
                sizes: sizeAgg.map((s: any) => s._id).filter((v: string) => v && v.trim() !== ""),
                priceRange: priceAgg.length > 0 ? { min: priceAgg[0].min || 0, max: priceAgg[0].max || 10000 } : { min: 0, max: 10000 },
                brands: brandAgg,
                attributes: attrAgg.map((a: any) => ({
                    key: a._id,
                    values: a.values.flat().filter((v: any) => v != null && String(v).trim() !== "").sort()
                })).filter((a: any) => a.key && a.values.length > 0),
            };

            return res.status(200).json({
                message: "Products fetched with filters",
                data: {
                    products,
                    pagination: {
                        currentPage: pageNum,
                        totalPages,
                        totalCount,
                        limit: limitNum,
                        hasNextPage: pageNum < totalPages,
                        hasPrevPage: pageNum > 1,
                    },
                    filters,
                }
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new ProductService();
