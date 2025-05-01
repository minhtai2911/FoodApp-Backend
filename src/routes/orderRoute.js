import { Router } from "express";
import orderController from "../controllers/orderController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = Router();

router.get(
  "/",
  authMiddleware.verifyToken,
  authMiddleware.checkPermission(["Admin", "Employee"]),
  orderController.getAllOrders
);
router.get("/:id", authMiddleware.verifyToken, orderController.getOrderById);
router.post("/", authMiddleware.verifyToken, orderController.createOrder);
router.get(
  "/get/userId",
  authMiddleware.verifyToken,
  orderController.getAllOrdersByUserId
);
router.post("/checkoutWithMoMo", orderController.checkoutWithMoMo);
router.post("/callback", orderController.callbackMoMo);
router.post("/checkStatusTransaction", orderController.checkStatusTransaction);
router.put(
  "/deliveryInfo/:id",
  authMiddleware.verifyToken,
  authMiddleware.checkPermission(["Employee"]),
  orderController.updateDeliveryInfoById
);
router.put(
  "/paymentStatus/:id",
  authMiddleware.verifyToken,
  authMiddleware.checkPermission(["Employee"]),
  orderController.updatePaymentStatusById
);
router.post("/sendDeliveryInfo", orderController.sendMailDeliveryInfo);

export default router;
