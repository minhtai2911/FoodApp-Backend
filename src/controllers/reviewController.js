import Review from "../models/review.js";
import Product from "../models/product.js";
import mongoose from "mongoose";
import { messages } from "../config/messageHelper.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import invalidateCache from "../utils/changeCache.js";
import analyzeSentiment from "../utils/analyzeSentiment.js";
import banOffensiveComment from "../utils/banOffensiveComment.js";
import { reviewStatus } from "../config/reviewStatus.js";
import logger from "../utils/logger.js";

const getAllReviews = asyncHandler(async (req, res, next) => {
  const query = {};
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  if (req.query.productId)
    query.productId = new mongoose.Types.ObjectId(req.query.productId);
  if (req.query.isActive) query.isActive = req.query.isActive;
  if (req.query.rating) query.rating = parseInt(req.query.rating);
  if (req.query.userId)
    query.userId = new mongoose.Types.ObjectId(req.query.userId);
  if (req.query.orderId)
    query.orderId = new mongoose.Types.ObjectId(req.query.orderId);
  if (req.query.status) query.status = req.query.status;

  const cacheKey = `reviews:${page}:${limit}:${query.productId || "null"}:${
    query.rating || "null"
  }:${query.isActive || "null"}:${query.userId || "null"}:${
    query.orderId || "null"
  }:${query.status || "null"}`;
  const cachedReviews = await req.redisClient.get(cacheKey);

  if (cachedReviews) {
    logger.info("Lấy danh sách đánh giá thành công!", {
      ...query,
      page,
      limit,
    });
    return res.status(200).json(JSON.parse(cachedReviews));
  }

  const totalCount = await Review.countDocuments(query);
  const reviews = await Review.find(query)
    .sort({ createdDate: -1 })
    .skip(skip)
    .limit(limit)
    .exec();

  const result = {
    meta: {
      totalCount: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    },
    data: reviews,
  };

  await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));
  logger.info("Lấy danh sách đánh giá thành công!", { ...query, page, limit });
  res.status(200).json(result);
});

const createReview = asyncHandler(async (req, res, next) => {
  const { productId, rating, content, orderId } = req.body;
  const userId = req.user.id;

  if (!productId || !rating || !orderId || !content) {
    logger.warn(messages.MSG1);
    throw new Error(messages.MSG1);
  }

  const existingReview = await Review.findOne({
    userId,
    productId,
    orderId,
  });

  if (existingReview) {
    logger.warn("Đánh giá đã tồn tại!");
    return res.status(409).json({});
  }

  const newReview = new Review({
    userId,
    productId,
    orderId,
    rating,
    content,
  });

  if (banOffensiveComment(newReview.content)) {
    logger.info(messages.MSG61);
    return res.status(403).json({ message: messages.MSG61 });
  }

  const sentiment = await analyzeSentiment(newReview.content);

  switch (sentiment) {
    case "NEG":
      newReview.type = "Tiêu cực";
      break;
    case "NEU":
      newReview.type = "Trung lập";
      break;
    case "POS":
      newReview.type = "Tích cực";
      break;
    default:
      throw new Error("Error");
  }

  const product = await Product.findById(productId);
  if (!product) {
    logger.warn("Sản phẩm không tồn tại");
    return res.status(404).json({ error: "Not found" });
  }

  const cacheKey = `product:${product._id}`;
  product.totalReview = product.totalReview + 1;
  product.rating =
    (rating + product.rating * (product.totalReview - 1)) / product.totalReview;
  await req.redisClient.hincrby(cacheKey, "totalReview", 1);
  await req.redisClient.hset(cacheKey, "rating", JSON.stringify(product.rating));
  invalidateCache(req, "review", "reviews", newReview._id.toString());

  logger.info(messages.MSG20);
  await product.save();
  await newReview.save();
  return res.status(201).json({
    message: messages.MSG20,
    data: newReview,
  });
});

const getReviewById = asyncHandler(async (req, res, next) => {
  const cacheKey = `review:${req.params.id}`;
  const cachedReview = await req.redisClient.hgetall(cacheKey);

  if (Object.keys(cachedReview).length > 1) {
    logger.info("Lấy đánh giá sản phẩm thành công!");
    const parsedData = {};

    for (const key in cachedReview) {
      try {
        parsedData[key] = JSON.parse(cachedReview[key]);
      } catch (err) {
        parsedData[key] = cachedReview[key];
      }
    }
    return res.status(200).json({ data: parsedData });
  }

  const review = await Review.findById(req.params.id).lean();

  if (!review) {
    logger.warn("Đánh giá sản phẩm không tồn tại");
    return res.status(404).json({ error: "Not found" });
  }

  for (const key in review) {
    await req.redisClient.hset(cacheKey, key, JSON.stringify(review[key]));
  }

  logger.info("Lấy đánh giá sản phẩm thành công!");
  res.status(200).json({ data: review });
});

const updateReviewById = asyncHandler(async (req, res, next) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    logger.warn("Đánh giá sản phẩm không tồn tại");
    return res.status(404).json({ error: "Not found" });
  }

  const { rating, content } = req.body;

  if (!rating) {
    logger.warn(messages.MSG1);
    throw new Error(messages.MSG1);
  }

  const product = await Product.findById(review.productId);

  if (!product) {
    logger.warn("Sản phẩm không tồn tại");
    return res.status(404).json({ error: "Not found" });
  }

  product.rating =
    (product.rating * product.totalReview - review.rating + rating) /
    product.totalReview;

  review.rating = rating || review.rating;
  review.content = content || review.content;

  if (banOffensiveComment(review.content)) {
    logger.info(messages.MSG61);
    return res.status(403).json({ message: messages.MSG61 });
  }

  const sentiment = await analyzeSentiment(review.content);

  switch (sentiment) {
    case "NEG":
      review.type = "Tiêu cực";
      break;
    case "NEU":
      review.type = "Trung lập";
      break;
    case "POS":
      review.type = "Tích cực";
      break;
    default:
      throw new Error("Error");
  }

  const cacheKey = `product:${product._id}`;
  await req.redisClient.hincrby(cacheKey, "totalReview", 1);
  await req.redisClient.hset(cacheKey, "rating", JSON.stringify(product.rating));
  invalidateCache(req, "review", "reviews", review._id.toString());
  logger.info(messages.MSG59);
  await review.save();
  await product.save();

  res.status(200).json({
    message: messages.MSG59,
    data: review,
  });
});

const deleteReviewById = asyncHandler(async (req, res, next) => {
  const review = await Review.findByIdAndDelete(req.params.id);

  if (!review) {
    logger.warn("Xóa đánh giá sản phẩm thành công!");
    return res.status(404).json({ error: "Not found" });
  }

  const product = await Product.findById(review.productId);
  if (!product) {
    logger.warn("Sản phẩm không tồn tại");
    return res.status(404).json({ error: "Not found" });
  }

  const cacheKey = `product:${product._id}`;
  product.totalReview = product.totalReview - 1;
  product.rating =
    (product.rating * (product.totalReview + 1) - review.rating) /
    product.totalReview;
  await req.redisClient.hincrby(cacheKey, "totalReview", 1);
  await req.redisClient.hset(cacheKey, "rating", JSON.stringify(product.rating));
  invalidateCache(req, "review", "reviews", req.params.id);

  await product.save();
  logger.info(messages.MSG60);
  res.status(200).json({ message: messages.MSG60 });
});

const createResponse = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const content = req.body.content;
  const reviewId = req.body.reviewId;

  if (banOffensiveComment(content)) {
    logger.info(messages.MSG62);
    return res.status(403).json({ message: messages.MSG62 });
  }

  const review = await Review.findById(reviewId);
  if (!review) {
    logger.warn("Đánh giá sản phẩm không tồn tại");
    return res.status(404).json({ error: "Not found" });
  }

  review.response.push({ userId, content });
  review.status = reviewStatus.REPLIED;
  invalidateCache(req, "review", "reviews", review._id.toString());
  logger.info(messages.MSG45);
  review.save();
  res.status(200).json({ message: messages.MSG45, data: review });
});

const hideReviewById = asyncHandler(async (req, res, next) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    logger.warn("Đánh giá sản phẩm không tồn tại");
    return res.status(404).json({ error: "Not found" });
  }

  review.isActive = false;

  invalidateCache(req, "review", "reviews", review._id.toString());
  logger.info(messages.MSG63);
  await review.save();
  res.status(200).json({ message: messages.MSG63 });
});

const unhideReviewById = asyncHandler(async (req, res, next) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    logger.warn("Đánh giá sản phẩm không tồn tại");
    return res.status(404).json({ error: "Not found" });
  }

  review.isActive = true;

  await review.save();

  invalidateCache(req, "review", "reviews", review._id.toString());
  logger.info(messages.MSG64);

  await review.save();
  res.status(200).json({ message: messages.MSG64 });
});

export default {
  createReview: createReview,
  getReviewById: getReviewById,
  updateReviewById: updateReviewById,
  deleteReviewById: deleteReviewById,
  getAllReviews: getAllReviews,
  createResponse: createResponse,
  hideReviewById: hideReviewById,
  unhideReviewById: unhideReviewById,
};
