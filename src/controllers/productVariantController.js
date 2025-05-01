import ProductVariant from "../models/productVariant.js";
import { messages } from "../config/messageHelper.js";
import invalidateCache from "../utils/changeCache.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import logger from "../utils/logger.js";

const getProductVariantById = asyncHandler(async (req, res, next) => {
  const cacheKey = `productVariant:${req.params.id}`;
  const cachedProductVariant = await req.redisClient.hgetall(cacheKey);

  if (Object.keys(cachedProductVariant).length > 1) {
    logger.info("Lấy biến thể sản phẩm thành công!");
    const parsedData = {};

    for (const key in cachedProductVariant) {
      try {
        parsedData[key] = JSON.parse(cachedProductVariant[key]);
      } catch (err) {
        parsedData[key] = cachedProductVariant[key];
      }
    }
    return res.status(200).json({ data: parsedData });
  }

  const productVariant = await ProductVariant.findById(req.params.id).lean();

  if (!productVariant) {
    logger.warn("Biến thể sản phẩm không tồn tại");
    return res.status(404).json({ error: "Not found" });
  }

  for (const key in productVariant) {
    await req.redisClient.hset(cacheKey, key, JSON.stringify(productVariant[key]));
  }

  logger.info("Lấy biến thể sản phẩm thành công!");
  res.status(200).json({ data: productVariant });
});

const getProductVariantByProductInfo = asyncHandler(async (req, res, next) => {
  const query = {};

  if (req.query.productId) query.productId = req.query.productId;
  else throw new Error(messages.MSG1);
  if (req.query.size) query.size = req.query.size;
  else throw new Error(messages.MSG1);

  const cacheKey = `productVariant:${query.productId}:${query.size}`;
  const cachedProductVariant = await req.redisClient.hgetall(cacheKey);

  if (Object.keys(cachedProductVariant).length > 1) {
    logger.info("Lấy biến thể sản phẩm thành công!", query);
    const parsedData = {};

    for (const key in cachedProductVariant) {
      try {
        parsedData[key] = JSON.parse(cachedProductVariant[key]);
      } catch (err) {
        parsedData[key] = cachedProductVariant[key];
      }
    }
    return res.status(200).json({ data: parsedData });
  }
  const productVariant = await ProductVariant.findOne(query).lean();

  if (!productVariant) {
    logger.warn("Biến thể sản phẩm không tồn tại", query);
    return res.status(404).json({ error: "Not found" });
  }

  for (const key in productVariant) {
    await req.redisClient.hset(cacheKey, key, JSON.stringify(productVariant[key]));
  }

  logger.info("Lấy biến thể sản phẩm thành công!", query);
  res.status(200).json({ data: productVariant });
});

const getProductVariantsByProductId = asyncHandler(async (req, res, next) => {
  const cacheKey = `productVariants:${req.params.id}`;
  const cachedProductVariants = await req.redisClient.get(cacheKey);

  if (cachedProductVariants) {
    logger.info("Lấy danh sách biến thể sản phẩm thành công!");
    return res.status(200).json({data: JSON.parse(cachedProductVariants)});
  }

  const productVariants = await ProductVariant.find({
    productId: req.params.id,
  });

  await req.redisClient.setex(cacheKey, 300, JSON.stringify(productVariants));
  logger.info("Lấy danh sách biến thể sản phẩm thành công!");
  res.status(200).json({ data: productVariants });
});

const createProductVariant = asyncHandler(async (req, res, next) => {
  const { productId, size, stock } = req.body;

  if (!productId || !size || !stock) {
    logger.warn(messages.MSG1);
    throw new Error(messages.MSG1);
  }

  const existingProductVariant = await ProductVariant.findOne({
    productId,
    size,
  });

  if (existingProductVariant) {
    logger.warn(messages.MSG57);
    return res.status(409).json({
      message: messages.MSG57,
    });
  }

  const newProductVariant = new ProductVariant({
    productId,
    size,
    stock,
  });

  invalidateCache(
    req,
    "productVariant",
    "productVariants",
    newProductVariant._id.toString()
  );
  logger.info("Tạo biến thể sản phẩm thành công!");
  await newProductVariant.save();
  res.status(201).json({ data: newProductVariant });
});

const updateProductVariantById = asyncHandler(async (req, res, next) => {
  const updateProductVariant = await ProductVariant.findById(req.params.id);

  if (!updateProductVariant) {
    logger.warn("Biến thể sản phẩm không tồn tại");
    return res.status(404).json({ error: "Not found" });
  }

  let check = true;

  if (
    req.body.productId == updateProductVariant.productId &&
    req.body.size == updateProductVariant.size
  ) {
    check = false;
  }

  updateProductVariant.productId =
    req.body.productId || updateProductVariant.productId;
  updateProductVariant.size = req.body.size || updateProductVariant.size;
  updateProductVariant.stock = req.body.stock || updateProductVariant.stock;

  const productId = updateProductVariant.productId;
  const size = updateProductVariant.size;
  const existingProductVariant = await ProductVariant.findOne({
    productId,
    size,
  });

  if (existingProductVariant && check) {
    logger.warn(messages.MSG57);
    return res.status(409).json({
      message: messages.MSG57,
    });
  }

  invalidateCache(
    req,
    "productVariant",
    "productVariants",
    updateProductVariant._id.toString()
  );
  logger.info("Cập nhật biến thể sản phẩm thành công!");
  await updateProductVariant.save();
  res.status(200).json({ data: updateProductVariant });
});

const deleteProductVariantById = asyncHandler(async (req, res, next) => {
  const deleteProductVariant = await ProductVariant.findByIdAndDelete(
    req.params.id
  );

  if (!deleteProductVariant) {
    logger.warn("Biến thể sản phẩm không tồn tại");
    return res.status(404).json({ error: "Not found" });
  }

  invalidateCache(req, "productVariant", "productVariants", req.params.id);
  logger.info("Xóa biến thể sản phẩm thành công");
  res.status(200).json();
});

export default {
  getProductVariantById: getProductVariantById,
  getProductVariantsByProductId: getProductVariantsByProductId,
  createProductVariant: createProductVariant,
  updateProductVariantById: updateProductVariantById,
  deleteProductVariantById: deleteProductVariantById,
  getProductVariantByProductInfo: getProductVariantByProductInfo,
};
