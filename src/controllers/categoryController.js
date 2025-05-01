import Category from "../models/category.js";
import chatbotController from "./chatbotController.js";
import { messages } from "../config/messageHelper.js";
import invalidateCache from "../utils/changeCache.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import logger from "../utils/logger.js";

const getAllCategories = asyncHandler(async (req, res, next) => {
  const query = {};
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  if (req.query.isActive) query.isActive = req.query.isActive;
  if (req.query.search) query.name = new RegExp(req.query.search, "i");

  const cacheKey = `categories:${page}:${limit}:${query.isActive || "null"}:${
    query.name || "null"
  }`;
  const cachedCategories = await req.redisClient.get(cacheKey);

  if (cachedCategories) {
    logger.info("Lấy danh sách danh mục sản phẩm thành công!", {
      ...query,
      page,
      limit,
    });
    return res.status(200).json(JSON.parse(cachedCategories));
  }

  const totalCount = await Category.countDocuments(query);
  const category = await Category.find(query).skip(skip).limit(limit).exec();

  const result = {
    meta: {
      totalCount: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    },
    data: category,
  };

  await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));
  logger.info("Lấy danh sách danh mục sản phẩm thành công!", {
    ...query,
    page,
    limit,
  });
  res.status(200).json(result);
});

const getCategoryById = asyncHandler(async (req, res, next) => {
  const cacheKey = `category:${req.params.id}`;
  const cachedCategory = await req.redisClient.get(cacheKey);

  if (cachedCategory) {
    logger.info("Lấy danh mục sản phẩm thành công!");
    return res.status(200).json(JSON.parse(cachedCategory));
  }

  const category = await Category.findById(req.params.id);

  if (!category) {
    logger.warn("Danh mục sản phẩm không tồn tại");
    return res.status(404).json({ error: "Not found" });
  }

  await req.redisClient.setex(cacheKey, 3600, JSON.stringify(category));
  logger.info("Lấy danh mục sản phẩm thành công!");
  res.status(200).json({ data: category });
});

const createCategory = asyncHandler(async (req, res, next) => {
  const { name } = req.body;

  if (!name) {
    logger.warn(messages.MSG1);
    throw new Error(messages.MSG1);
  }

  const existingCategory = await Category.findOne({
    name: name,
  });

  if (existingCategory) {
    logger.warn(messages.MSG56);
    return res.status(409).json({ message: messages.MSG56 });
  }

  const newCategory = new Category({ name });

  chatbotController.updateEntityCategory(name, [name]);
  await newCategory.save();
  await invalidateCache(
    req,
    "category",
    "categories",
    newCategory._id.toString()
  );

  logger.info(messages.MSG31, newCategory._id);
  res.status(201).json({
    message: messages.MSG31,
    data: newCategory,
  });
});

const updateCategoryById = asyncHandler(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    logger.warn("Danh mục sản phẩm không tồn tại");
    return res.status(404).json({ error: "Not found" });
  }

  const { name } = req.body;

  const existingCategory = await Category.findOne({
    name: name,
  });

  if (
    existingCategory &&
    existingCategory._id.toString() == category._id.toString()
  ) {
    logger.warn(messages.MSG56);
    return res.status(409).json({ message: messages.MSG56 });
  }

  chatbotController.deleteEntityCategory(category.name);
  chatbotController.updateEntityCategory(name, [name]);

  category.name = name || category.name;

  await category.save();
  await invalidateCache(req, "category", "categories", category._id.toString());

  logger.info(messages.MSG26);
  res.status(200).json({
    message: messages.MSG26,
    data: category,
  });
});

const updateStatusCategoryById = asyncHandler(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    logger.warn("Danh mục sản phẩm không tồn tại");
    return res.status(404).json({ error: "Not found" });
  }

  category.isActive = !category.isActive;

  await category.save();
  await invalidateCache(req, "category", "categories", category._id.toString());

  if (category.isActive) {
    logger.info(messages.MSG29);
    res.status(200).json({ message: messages.MSG29 });
  } else {
    logger.info(messages.MSG30);
    res.status(200).json({ message: messages.MSG30 });
  }
});

export default {
  getAllCategories: getAllCategories,
  getCategoryById: getCategoryById,
  createCategory: createCategory,
  updateCategoryById: updateCategoryById,
  updateStatusCategoryById: updateStatusCategoryById,
};
