import { Router } from "express";
import recommendationController from "../controllers/recommendationController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = Router();

router.get(
  "/",
  authMiddleware.verifyToken,
  recommendationController.recommend
);

export default router;
