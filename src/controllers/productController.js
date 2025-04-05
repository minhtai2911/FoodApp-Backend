import Product from "../models/product.js";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import asyncHandler from "../middlewares/asyncHandler.js";
import invalidateCache from "../utils/changeCache.js";

const getAllProducts = asyncHandler(async (req, res, next) => {
  const query = {};

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  let sortBy = "name";
  let sortOrder = "asc";

  if (req.query.isActive) query.isActive = req.query.isActive;
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

  return res.status(200).json(result);
});

const createProduct = asyncHandler(async (req, res, next) => {
  const { name, description, categoryId, price, discountPrice } = req.body;

  if (!name || !description || !categoryId || !price) {
    throw new Error("Vui lòng điền đầy đủ thông tin bắt buộc!");
  }

  const newProduct = new Product({
    name,
    description,
    categoryId,
    price,
    discountPrice,
  });

  await newProduct.save();
  invalidateCache(req, "product", "products", newProduct._id.toString());
  res.status(201).json({ message: "Thêm sản phẩm thành công!", data: newProduct });
});

const getProductById = asyncHandler(async (req, res, next) => {
  const cacheKey = `order:${req.params.id}`;
  const cachedProduct = await req.redisClient.get(cacheKey);

  if (cachedProduct) {
    return res.status(200).json(JSON.parse(cachedProduct));
  }

  const product = await Product.findById(req.params.id);

  if (!product) return res.status(404).json({ error: "Not found" });

  await req.redisClient.setex(cacheKey, 3600, JSON.stringify(product));
  res.status(200).json({ data: product });
});

const updateProductById = asyncHandler(async (req, res, next) => {
  const updateProduct = await Product.findById(req.params.id);

  if (!updateProduct) return res.status(404).json({ error: "Not found" });

  const { name, description, categoryId, price, discountPrice } = req.body;

  updateProduct.name = name || updateProduct.name;
  updateProduct.description = description || updateProduct.description;
  updateProduct.categoryId = categoryId || updateProduct.categoryId;
  updateProduct.price = price || updateProduct.price;
  updateProduct.discountPrice = discountPrice || updateProduct.discountPrice;

  await updateProduct.save();
  invalidateCache(req, "product", "products", updateProduct._id.toString());
  res.status(200).json({ message: "Chỉnh sửa sản phẩm thành công!", data: updateProduct });
});

const updateStatusProductById = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) return res.status(404).json({ error: "Not found" });

  product.isActive = !product.isActive;

  await product.save();
  invalidateCache(req, "product", "products", product._id.toString());
  if (product.isActive) res.status(200).json({ message: "Khôi phục sản phẩm thành công!" });
  else res.status(200).json({ message: "Lưu trữ sản phẩm thành công!" });
});

const createImages = async (req, res, next) => {
  try {
    const productId = req.body.productId;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: "Not found" });

    for (let i = 0; i < req.files.length; i++) {
      let imagePath = req.files[i].path.replace(/\\/g, "/");
      const start = imagePath.indexOf("products");
      imagePath = imagePath.slice(start);
      imagePath = `${process.env.URL_SERVER}/${imagePath}`;
      product.images.push(imagePath);
    }
    await product.save();
    invalidateCache(req, "product", "products", product._id.toString());
    res.status(201).json({ data: product });
  } catch (err) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    for (let i = 0; i < req.files.length; i++) {
      fs.unlinkSync(path.join(__dirname, "../..", req.files[i].path));
    }
    res.status(500).json({
      error: err.message,
      message: "Đã xảy ra lỗi, vui lòng thử lại!",
    });
  }
};

const deleteImageById = asyncHandler(async (req, res, next) => {
  const productId = req.params.productId;
  const index = req.params.index;
  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ error: "Not found" });
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const deleteStart = product.images[index].indexOf("/products");
  const deleteFile = "\\public" + product.images[index].slice(deleteStart);
  fs.unlinkSync(path.join(__dirname, "..", deleteFile));
  product.images.splice(index, 1);
  await product.save();
  invalidateCache(req, "product", "products", product._id.toString());
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
