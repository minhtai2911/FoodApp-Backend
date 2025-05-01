import Statistic from "../models/statistic.js";
import Order from "../models/order.js";
import { orderStatus } from "../config/orderStatus.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import logger from "../utils/logger.js";

const createStatistic = asyncHandler(async (req, res, next) => {
  const { day, month, year } = req.body;

  const todayStart = new Date(year, month - 1, day);
  const todayEnd = new Date(year, month - 1, day + 1);

  const totalOrder = await Order.countDocuments({
    $expr: {
      $eq: [
        { $arrayElemAt: ["$deliveryInfo.status", -1] },
        orderStatus.SHIPPED,
      ],
    },
    updatedAt: { $gte: todayStart, $lt: todayEnd },
  });

  const totalRevenue = await Order.aggregate([
    {
      $match: {
        $expr: {
          $eq: [
            { $arrayElemAt: ["$deliveryInfo.status", -1] },
            orderStatus.SHIPPED,
          ],
        },
        updatedAt: { $gte: todayStart, $lt: todayEnd },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$finalPrice" },
      },
    },
  ]);

  if (!totalRevenue[0]) totalRevenue[0] = { totalRevenue: 0 };

  const statistic = new Statistic({
    day: day,
    month: month,
    year: year,
    totalOrder: totalOrder,
    totalRevenue: totalRevenue[0].totalRevenue,
  });

  await statistic.save();
  logger.info("Tạo báo cáo thành công!");
  res.status(201).json({ data: statistic });
});

const getStatistics = asyncHandler(async (req, res, next) => {
  const query = {};
  if (req.query.year) query.year = parseInt(req.query.year);
  if (req.query.month) query.month = parseInt(req.query.month);
  if (req.query.day) query.day = parseInt(req.query.day);

  let statistics;

  if (!req.query.day && !req.query.month) {
    statistics = await Statistic.aggregate([
      {
        $match: query,
      },
      {
        $group: {
          _id: { year: "$year", month: "$month" },
          totalOrder: { $sum: "$totalOrder" },
          totalRevenue: { $sum: "$totalRevenue" },
        },
      },
      {
        $sort: { "_id.year": -1, "_id.month": -1 },
      },
    ]);
  } else {
    statistics = await Statistic.find(query).sort({
      year: -1,
      month: -1,
      day: -1,
    });
  }

  if (!statistics) {
    logger.warn("Báo cáo không tồn tại");
    return res.status(404).json({ error: "Báo cáo không tồn tại." });
  }

  logger.info("Lấy báo cáo thành công!");
  res.status(200).json({ data: statistics });
});

export const addOrderToReport = async (finalPrice) => {
  try {
    const today = new Date();

    const statistic = await Statistic.findOne({
      day: today.getDate(),
      month: today.getMonth() + 1,
      year: today.getFullYear(),
    });

    if (statistic) {
      statistic.totalOrder++;
      statistic.totalRevenue += finalPrice;
      await statistic.save();
    } else {
      const newStatistic = new Statistic({
        day: today.getDate(),
        month: today.getMonth() + 1,
        year: today.getFullYear(),
        totalOrder: 1,
        totalRevenue: finalPrice,
      });
      await newStatistic.save();
    }
  } catch (err) {
    throw new Error(err.message);
  }
};

export default {
  createStatistic: createStatistic,
  getStatistics: getStatistics,
};
