import { Router } from "express";
import ShoppingCartController from "../controllers/shoppingCartController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = Router();

router.post(
  "/",
  authMiddleware.verifyToken,
  ShoppingCartController.createShoppingCart
);
router.put(
  "/:id",
  authMiddleware.verifyToken,
  ShoppingCartController.updateShoppingCartQuantityById
);
router.delete(
  "/:id",
  authMiddleware.verifyToken,
  ShoppingCartController.deleteShoppingCartById
);
router.get(
  "/:id",
  authMiddleware.verifyToken,
  ShoppingCartController.getShoppingCartById
);
router.get(
  "/",
  authMiddleware.verifyToken,
  ShoppingCartController.getShoppingCartByUserId
);

export default router;
