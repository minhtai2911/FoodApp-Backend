import Coordinate from "../models/coordinate.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import logger from "../utils/logger.js";
import { messages } from "../config/messageHelper.js";

const createCoordinate = asyncHandler(async (req, res, next) => {
  const { latitude, longitude, orderId } = req.body;

  if (!latitude || !longitude || !orderId) {
    logger.warn(messages.MSG1);
    throw new Error(messages.MSG1);
  }
  const userId = req.user.id;

  const existingCoordinate = await Coordinate.findOne({ orderId });
  if (existingCoordinate) {
    logger.warn("Coordinates already exist for this order");
    return res
      .status(400)
      .json({ error: "Coordinates already exist for this order" });
  }

  const coordinate = await Coordinate.create({
    userId,
    latitude,
    longitude,
    orderId,
  });

  res.status(201).json({
    data: coordinate,
  });
});

const getCoordinateByOrderId = asyncHandler(async (req, res, next) => {
  const coordinates = await Coordinate.findOne({ orderId: req.params.orderId });

  if (!coordinates) {
    logger.warn("Coordinates not found");
    return res.status(404).json({ error: "Coordinates not found" });
  }

  res.status(200).json({
    data: coordinates,
  });
});

const updateCoordinateById = asyncHandler(async (req, res, next) => {
  const { latitude, longitude } = req.body;

  if (!latitude && !longitude) {
    logger.warn(messages.MSG1);
    throw new Error(messages.MSG1);
  }

  if (req.user.id.toString() !== coordinate.userId.toString()) {
    logger.warn(
      "Bạn không có quyền truy cập vào tài nguyên này. Vui lòng liên hệ với quản trị viên."
    );
    return res.status(403).json({
      message:
        "Bạn không có quyền truy cập vào tài nguyên này. Vui lòng liên hệ với quản trị viên.",
    });
  }

  const coordinate = await Coordinate.findById(req.params.id);

  if (!coordinate) {
    logger.warn("Coordinate not found");
    return res.status(404).json({ error: "Coordinate not found" });
  }

  coordinate.latitude = latitude || coordinate.latitude;
  coordinate.longitude = longitude || coordinate.longitude;

  coordinate.save();

  res.status(200).json({
    data: coordinate,
  });
});

export default {
  createCoordinate: createCoordinate,
  getCoordinateByOrderId: getCoordinateByOrderId,
  updateCoordinateById: updateCoordinateById,
};
