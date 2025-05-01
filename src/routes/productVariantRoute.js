import { Router } from "express";
import productVariantController from "../controllers/productVariantController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/:id", productVariantController.getProductVariantById); 
router.post("/", authMiddleware.verifyToken, authMiddleware.checkPermission(["Admin"]), productVariantController.createProductVariant);
router.put("/:id", authMiddleware.verifyToken, authMiddleware.checkPermission(["Admin"]), productVariantController.updateProductVariantById);
router.delete("/:id", authMiddleware.verifyToken, authMiddleware.checkPermission(["Admin"]), productVariantController.deleteProductVariantById);
router.get("/productId/:id", productVariantController.getProductVariantsByProductId);
router.get("/get/productInfo", productVariantController.getProductVariantByProductInfo);

export default router;