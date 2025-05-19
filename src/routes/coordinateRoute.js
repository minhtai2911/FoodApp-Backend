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
  "/",
  authMiddleware.verifyToken,
  coordinateController.getCoordinateByUserId
);
router.put(
  "/:id",
  authMiddleware.verifyToken,
  coordinateController.updateCoordinateById
);

export default router;
