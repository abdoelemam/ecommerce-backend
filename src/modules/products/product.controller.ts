import { Router } from "express";
import { validate } from "../../middleware/validation.js";
import { createProductSchema, updateProductSchema } from "./product.validation.js";
import productService from "./product.service.js";
import { auth, authorize } from "../../middleware/auth.js";
import { Roletype } from "../../model/user.model.js";
import { MulterHost, filevalidation } from "../../middleware/multer.js";

const productRouter = Router();

productRouter.get("/", productService.getProducts);
productRouter.get("/faceted", productService.getProductsWithFilters);
productRouter.get("/:id", productService.getProductById);

const uploadImages = MulterHost({ filetypes: filevalidation.image }).array("images", 5);

productRouter.post(
    "/",
    auth,
    authorize(Roletype.admin),
    uploadImages,
    validate(createProductSchema),
    productService.createProduct
);

productRouter.put(
    "/:id",
    auth,
    authorize(Roletype.admin),
    uploadImages,
    validate(updateProductSchema),
    productService.updateProduct
);

productRouter.delete(
    "/:id",
    auth,
    authorize(Roletype.admin),
    validate({ params: updateProductSchema.params }), 
    productService.deleteProduct
);

export default productRouter;
