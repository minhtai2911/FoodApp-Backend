import { Router } from "express";
import reviewController from "../controllers/reviewController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = Router();

router.post(
  "/response",
  authMiddleware.verifyToken,
  authMiddleware.checkPermission(["Employee"]),
  reviewController.createResponse
);
router.get("/", reviewController.getAllReviews);
router.post("/", authMiddleware.verifyToken, reviewController.createReview);
router.get("/:id", reviewController.getReviewById);
router.put(
  "/:id",
  authMiddleware.verifyToken,
  reviewController.updateReviewById
);
router.delete(
  "/:id",
  authMiddleware.verifyToken,
  reviewController.deleteReviewById
);
router.put(
  "/hide/:id",
  authMiddleware.verifyToken,
  authMiddleware.checkPermission(["Admin"]),
  reviewController.hideReviewById
);
router.put(
  "/unhide/:id",
  authMiddleware.verifyToken,
  authMiddleware.checkPermission(["Admin"]),
  reviewController.unhideReviewById
);

export default router;
