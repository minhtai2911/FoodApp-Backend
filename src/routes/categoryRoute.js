import { Router } from "express";
import categoryController from "../controllers/categoryController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/", categoryController.getAllCategories);
router.get("/:id", categoryController.getCategoryById);
router.post("/", authMiddleware.verifyToken, authMiddleware.checkPermission(["Admin"]), categoryController.createCategory);
router.put("/:id", authMiddleware.verifyToken, authMiddleware.checkPermission(["Admin"]), categoryController.updateCategoryById);
router.put("/archive/:id", authMiddleware.verifyToken, authMiddleware.checkPermission(["Admin"]), categoryController.updateStatusCategoryById);

export default router;