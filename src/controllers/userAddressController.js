import UserAddress from "../models/userAddress.js";
import { messages } from "../config/messageHelper.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import logger from "../utils/logger.js";

const createUserAddress = asyncHandler(async (req, res, next) => {
  const { city, district, commune, street, phone } = req.body;
  const userId = req.user.id;

  if (!city || !district || !commune || !street || !phone) {
    logger.warn(messages.MSG1);
    throw new Error(messages.MSG1);
  }

  const newUserAddress = new UserAddress({
    city,
    district,
    commune,
    street,
    phone,
    userId,
  });

  newUserAddress.save();
  logger.info("Tạo địa chỉ giao hàng thành công!");
  return res.status(201).json({ data: newUserAddress });
});

const updateUserAddressById = asyncHandler(async (req, res, next) => {
  const updateUserAddress = await UserAddress.findById(req.params.id);
  const { city, district, commune, street, phone } = req.body;
  const userId = req.user.id;

  updateUserAddress.userId = userId || updateUserAddress.userId;
  updateUserAddress.city = city || updateUserAddress.city;
  updateUserAddress.district = district || updateUserAddress.district;
  updateUserAddress.commune = commune || updateUserAddress.commune;
  updateUserAddress.street = street || updateUserAddress.street;
  updateUserAddress.phone = phone || updateUserAddress.phone;

  await updateUserAddress.save();
  logger.info("Cập nhật địa chỉ giao hàng thành công!");
  return res.status(200).json({ data: updateUserAddress });
});

const getUserAddressById = asyncHandler(async (req, res, next) => {
  const userAddress = await UserAddress.findById(req.params.id);

  if (!userAddress) {
    logger.warn("Địa chỉ giao hàng không tồn tại");
    return res.status(404).json({ error: "Not found" });
  }

  logger.info("Lấy địa chỉ giao hàng thành công!");
  res.status(200).json({ data: userAddress });
});

const getUserAddressByUserId = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const totalCount = await UserAddress.countDocuments({ userId });
  const userAddresses = await UserAddress.find({ userId })
    .skip(skip)
    .limit(limit)
    .exec();

  if (!userAddresses || userAddresses.length === 0) {
    logger.warn("Địa chỉ giao hàng không tồn tại");
    return res.status(404).json({ error: "Not found" });
  }

  logger.info("Lấy địa chỉ giao hàng thành công!");
  res.status(200).json({
    meta: {
      meta: {
        totalCount: totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
      },
      data: userAddresses,
    },
  });
});

export default {
  createUserAddress: createUserAddress,
  updateUserAddressById: updateUserAddressById,
  getUserAddressById: getUserAddressById,
  getUserAddressByUserId: getUserAddressByUserId,
};
