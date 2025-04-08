import {Router} from "express";
import productController from "../controllers/productController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import upload from "../middlewares/upload.js";

const router = Router();

router.get('/', productController.getAllProducts);
router.post('/', authMiddleware.verifyToken, authMiddleware.checkPermission(["Admin"]), productController.createProduct);
router.get('/:id', productController.getProductById);
router.put('/:id', authMiddleware.verifyToken, authMiddleware.checkPermission(["Admin"]), productController.updateProductById);
router.put('/archive/:id', authMiddleware.verifyToken, authMiddleware.checkPermission(["Admin"]), productController.updateStatusProductById);
router.post(
    "/images",
    authMiddleware.verifyToken,
    authMiddleware.checkPermission(["Admin"]),
    upload.array("images"),
    productController.createImages
  );
  router.delete(
    "/images/:productId/:publicId",
    authMiddleware.verifyToken,
    authMiddleware.checkPermission(["Admin"]),
    productController.deleteImageById
  );

export default router;