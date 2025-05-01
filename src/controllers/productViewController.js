import ProductView from "../models/productView.js";
import { messages } from "../config/messageHelper.js";
import asyncHandler from "../middlewares/asyncHandler.js";

const createProductView = asyncHandler(async (req, res, next) => {
  if (!req.body.productId) {
    logger.warn(messages.MSG1);
    return res.status(400).json({ error: "productId is required!" });
  }

  const existsProductView = await ProductView.findOne({
    productId: req.body.productId,
    userId: req.user.id,
  });

  if (existsProductView) {
    return res.status(400).json({
      error: "ProductView already exists",
    });
  }

  const productView = new ProductView({
    productId: req.body.productId,
    userId: req.user.id,
  });

  await productView.save();
  logger.info("Tạo thông tin xem sản phẩm thành công!");
  res.status(201).json({
    data: productView,
  });
});

export default {
  createProductView: createProductView,
};
