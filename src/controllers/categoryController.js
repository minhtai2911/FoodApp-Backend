import Category from "../models/category.js";
import invalidateCache from "../utils/changeCache.js";
import asyncHandler from "../middlewares/asyncHandler.js";

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

  res.status(200).json(result);
});

const getCategoryById = asyncHandler(async (req, res, next) => {
  const cacheKey = `category:${req.params.id}`;
  const cachedCategory = await req.redisClient.get(cacheKey);

  if (cachedCategory) {
    return res.status(200).json(JSON.parse(cachedCategory));
  }

  const category = await Category.findById(req.params.id);

  if (!category) return res.status(404).json({ error: "Not found" });

  await req.redisClient.setex(cacheKey, 3600, JSON.stringify(category));
  res.status(200).json({ data: category });
});

const createCategory = asyncHandler(async (req, res, next) => {
  const { name } = req.body;

  if (!name) throw new Error("Vui lòng điền đầy đủ thông tin bắt buộc!");

  const existingCategory = await Category.findOne({
    name: name,
  });

  if (existingCategory) {
    return res.status(409).json({ message: "Danh mục sản phẩm đã tồn tại!" });
  }

  const newCategory = new Category({ name });

  await newCategory.save();
  await invalidateCache(
    req,
    "category",
    "categories",
    newCategory._id.toString()
  );

  res.status(201).json({
    message: "Thêm danh mục sản phẩm thành công!",
    data: newCategory,
  });
});

const updateCategoryById = asyncHandler(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category) return res.status(404).json({ error: "Not found" });

  const { name } = req.body;

  const existingCategory = await Category.findOne({
    name: name,
  });

  if (
    existingCategory &&
    existingCategory._id.toString() == category._id.toString()
  ) {
    return res.status(409).json({ message: "Danh mục sản phẩm đã tồn tại!" });
  }

  category.name = name || category.name;

  await category.save();
  await invalidateCache(req, "category", "categories", category._id.toString());

  res.status(200).json({
    message: "Chỉnh sửa danh mục sản phẩm thành công!",
    data: category,
  });
});

const updateStatusCategoryById = asyncHandler(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category) return res.status(404).json({ error: "Not found" });

  category.isActive = !category.isActive;

  await category.save();
  await invalidateCache(req, "category", "categories", category._id.toString());

  if (category.isActive)
    res.status(200).json({ message: "Khôi phục sản phẩm thành công!" });
  else
    res.status(200).json({ message: "Lưu trữ danh mục sản phẩm thành công!" });
});

export default {
  getAllCategories: getAllCategories,
  getCategoryById: getCategoryById,
  createCategory: createCategory,
  updateCategoryById: updateCategoryById,
  updateStatusCategoryById: updateStatusCategoryById,
};
