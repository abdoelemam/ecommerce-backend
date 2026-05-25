import { Router } from "express";
import { validate } from "../../middleware/validation.js";
import { createCategorySchema, updateCategorySchema } from "./category.validation.js";
import categoryService from "./category.service.js";
import { auth, authorize } from "../../middleware/auth.js";
import { Roletype } from "../../model/user.model.js";
import { MulterHost, filevalidation } from "../../middleware/multer.js";

const categoryRouter = Router();

// GET /categories - Anyone can view categories
categoryRouter.get("/", categoryService.getCategories);

// GET /categories/:id - Get single category
categoryRouter.get("/:id", categoryService.getCategoryById);

// GET /categories/:id/subcategories - Get direct children
categoryRouter.get("/:id/subcategories", categoryService.getSubcategories);

// Setup multer for image upload
const uploadImage = MulterHost({ filetypes: filevalidation.image }).single("image");

// POST /categories - Admin Only
categoryRouter.post(
    "/",
    auth,
    authorize(Roletype.admin),
    uploadImage,
    validate(createCategorySchema),
    categoryService.createCategory
);

// PUT /categories/:id - Admin Only
categoryRouter.put(
    "/:id",
    auth,
    authorize(Roletype.admin),
    uploadImage,
    validate(updateCategorySchema),
    categoryService.updateCategory
);

// DELETE /categories/:id - Admin Only
categoryRouter.delete(
    "/:id",
    auth,
    authorize(Roletype.admin),
    // validation is light here, just checking id format can be done via validation or skipped if simple
    validate({ params: updateCategorySchema.params }), 
    categoryService.deleteCategory
);

export default categoryRouter;
