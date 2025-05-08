import { Router } from "express";
import userAddressController from "../controllers/userAddressController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/", authMiddleware.verifyToken,userAddressController.createUserAddress);
router.put("/:id" , authMiddleware.verifyToken, userAddressController.updateUserAddressById);
router.get("/:id", authMiddleware.verifyToken, userAddressController.getUserAddressById);
router.get("/", authMiddleware.verifyToken, userAddressController.getUserAddressByUserId);

export default router;