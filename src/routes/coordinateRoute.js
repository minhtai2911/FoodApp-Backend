import coordinateController from "../controllers/coordinateController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { Router } from "express";

const router = Router();

router.post(
  "/",
  authMiddleware.verifyToken,
  authMiddleware.checkPermission(["Employee"]),
  coordinateController.createCoordinate
);
router.get(
  "/:orderId",
  authMiddleware.verifyToken,
  coordinateController.getCoordinateByOrderId
);
router.put(
  "/:id",
  authMiddleware.verifyToken,
  authMiddleware.checkPermission(["Employee"]),
  coordinateController.updateCoordinateById
);

export default router;
