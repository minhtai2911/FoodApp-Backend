import Product from "../models/product.js";
import { messages } from "../config/messageHelper.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import invalidateCache from "../utils/changeCache.js";
import cloudinary from "../utils/cloudinary.js";
import logger from "../utils/logger.js";

const getAllProducts = asyncHandler(async (req, res, next) => {
  const query = {};
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  let sortBy = "name";
  let sortOrder = "asc";

  if (req.query.isActive) query.isActive = req.query.isActive;
  if (req.query.categoryId) query.categoryId = req.query.categoryId;
  if (req.query.minPrice) query.price = { $gte: req.query.minPrice };
  if (req.query.maxPrice)
    query.price = { ...query.price, $lte: req.query.maxPrice };
  if (req.query.search) query.name = new RegExp(req.query.search, "i");
  if (req.query.sortBy) sortBy = req.query.sortBy;
  if (req.query.sortOrder) sortOrder = req.query.sortOrder;

  const cacheKey = `products:${page}:${limit}:${sortOrder}:${sortBy}:${
    query.isActive || "null"
  }:${req.query.minPrice || "null"}:${req.query.maxPrice || "null"}:${
    query.name || "null"
  }`;
  const cachedProducts = await req.redisClient.get(cacheKey);

  if (cachedProducts) {
    logger.info("Lấy danh sách sản phẩm thành công!", {
      ...query,
      sortBy,
      sortOrder,
      page,
      limit,
    });
    return res.status(200).json(JSON.parse(cachedProducts));
  }

  const totalCount = await Product.countDocuments(query);

  const products = await Product.find(query)
    .populate("categoryId", "name")
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit)
    .exec();

  const result = {
    meta: {
      totalCount: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    },
    data: products,
  };

  await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));

  logger.info("Lấy danh sách sản phẩm thành công!", {
    ...query,
    sortBy,
    sortOrder,
    page,
    limit,
  });
  return res.status(200).json(result);
});

const createProduct = asyncHandler(async (req, res, next) => {
  const { name, description, categoryId, price, discountPrice } = req.body;

  if (!name || !description || !categoryId || !price) {
    logger.warn(messages.MSG1);
    throw new Error(messages.MSG1);
  }

  const newProduct = new Product({
    name,
    description,
    categoryId,
    price,
    discountPrice,
  });

  invalidateCache(req, "product", "products", newProduct._id.toString());
  logger.info(messages.MSG32);
  await newProduct.save();
  res.status(201).json({ message: messages.MSG32, data: newProduct });
});

const getProductById = asyncHandler(async (req, res, next) => {
  const cacheKey = `product:${req.params.id}`;
  const cachedProduct = await req.redisClient.hgetall(cacheKey);

  if (Object.keys(cachedProduct).length > 1) {
    logger.info("Lấy sản phẩm thành công!");
    const parsedData = {};

    for (const key in cachedProduct) {
      try {
        parsedData[key] = JSON.parse(cachedProduct[key]);
      } catch (err) {
        parsedData[key] = cachedProduct[key];
      }
    }
    return res.status(200).json({ data: parsedData });
  }

  const product = await Product.findById(req.params.id).lean();

  if (!product) {
    logger.warn("Sản phẩm không tồn tại");
    return res.status(404).json({ error: "Not found" });
  }

  for (const key in product) {
    await req.redisClient.hset(cacheKey, key, JSON.stringify(product[key]));
  }

  logger.info("Lấy sản phẩm thành công!");
  res.status(200).json({ data: product });
});

const updateProductById = asyncHandler(async (req, res, next) => {
  const updateProduct = await Product.findById(req.params.id);

  if (!updateProduct) {
    logger.warn("Sản phẩm không tồn tại");
    return res.status(404).json({ error: "Not found" });
  }

  const { name, description, categoryId, price, discountPrice } = req.body;

  updateProduct.name = name || updateProduct.name;
  updateProduct.description = description || updateProduct.description;
  updateProduct.categoryId = categoryId || updateProduct.categoryId;
  updateProduct.price = price || updateProduct.price;
  updateProduct.discountPrice = discountPrice || updateProduct.discountPrice;

  invalidateCache(req, "product", "products", updateProduct._id.toString());
  logger.info(messages.MSG33);
  await updateProduct.save();
  res.status(200).json({ message: messages.MSG33, data: updateProduct });
});

const updateStatusProductById = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    logger.warn("Sản phẩm không tồn tại");
    return res.status(404).json({ error: "Not found" });
  }

  product.isActive = !product.isActive;

  invalidateCache(req, "product", "products", product._id.toString());
  await product.save();
  if (product.isActive) {
    logger.info(messages.MSG29);
    res.status(200).json({ message: messages.MSG29 });
  } else {
    logger.info(messages.MSG35);
    res.status(200).json({ message: messages.MSG35 });
  }
});

const createImages = asyncHandler(async (req, res, next) => {
  const productId = req.body.productId;

  const product = await Product.findById(productId);
  if (!product) {
    logger.warn("Sản phẩm không tồn tại");
    return res.status(404).json({ error: "Not found" });
  }

  for (let i = 0; i < req.files.length; i++) {
    let image = await cloudinary.uploadImageToCloudinary(req.files[i].path);

    product.images.push({
      url: image.url,
      publicId: image.public_id,
    });
  }
  invalidateCache(req, "product", "products", product._id.toString());
  logger.info("Tạo sản phẩm thành công!");
  await product.save();
  res.status(201).json({ data: product });
});

const deleteImageById = asyncHandler(async (req, res, next) => {
  const productId = req.params.productId;
  const publicId = req.params.publicId;

  const product = await Product.findById(productId);
  if (!product) {
    logger.warn("Sản phẩm không tồn tại");
    return res.status(404).json({ error: "Not found" });
  }

  await cloudinary.deleteImageFromCloudinary(publicId);

  product.images = product.images.filter(
    (image) => image.publicId !== publicId
  );
  invalidateCache(req, "product", "products", product._id.toString());
  logger.info("Xóa ảnh của sản phẩm thành công!");
  await product.save();
  res.status(200).json({ data: product });
});

export default {
  getAllProducts: getAllProducts,
  createProduct: createProduct,
  getProductById: getProductById,
  updateProductById: updateProductById,
  updateStatusProductById: updateStatusProductById,
  createImages: createImages,
  deleteImageById: deleteImageById,
};
