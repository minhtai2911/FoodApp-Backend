import { Router } from "express";
import userRoleController from "../controllers/userRoleController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/", authMiddleware.verifyToken, userRoleController.getAllUserRoles);
router.get("/:id", authMiddleware.verifyToken, userRoleController.getUserRoleById);

export default router;