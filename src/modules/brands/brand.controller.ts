import { Router } from "express";
import { validate } from "../../middleware/validation.js";
import { createBrandSchema, updateBrandSchema } from "./brand.validation.js";
import brandService from "./brand.service.js";
import { auth, authorize } from "../../middleware/auth.js";
import { Roletype } from "../../model/user.model.js";
import { MulterHost, filevalidation } from "../../middleware/multer.js";

const brandRouter = Router();

brandRouter.get("/", brandService.getBrands);
brandRouter.get("/:id", brandService.getBrandById);

const uploadImage = MulterHost({ filetypes: filevalidation.image }).single("image");

brandRouter.post(
    "/",
    auth,
    authorize(Roletype.admin),
    uploadImage,
    validate(createBrandSchema),
    brandService.createBrand
);

brandRouter.put(
    "/:id",
    auth,
    authorize(Roletype.admin),
    uploadImage,
    validate(updateBrandSchema),
    brandService.updateBrand
);

brandRouter.delete(
    "/:id",
    auth,
    authorize(Roletype.admin),
    validate({ params: updateBrandSchema.params }), 
    brandService.deleteBrand
);

export default brandRouter;
