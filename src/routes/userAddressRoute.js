import { Router } from "express";
import userAddressController from "../controllers/userAddressController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/", userAddressController.createUserAddress);
router.put("/" , authMiddleware.verifyToken, userAddressController.updateUserAddressById);
router.get("/", authMiddleware.verifyToken, userAddressController.getUserAddressById);

export default router;