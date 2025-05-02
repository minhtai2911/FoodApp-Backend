import { Router } from "express";
import userAddressController from "../controllers/userAddressController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/", userAddressController.createUserAddress);
router.put("/:id" , authMiddleware.verifyToken, userAddressController.updateUserAddressById);
router.get("/:id", authMiddleware.verifyToken, userAddressController.getUserAddressById);

export default router;