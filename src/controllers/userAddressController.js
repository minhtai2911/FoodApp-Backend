import UserAddress from "../models/userAddress.js";
import asyncHandler from "../middlewares/asyncHandler.js";

const createUserAddress = asyncHandler(async (req, res, next) => {
  const { userId, city, district, commune, street, phone } = req.body;

  if (!city || !district || !commune || !street || !phone) {
    throw new Error("Vui lòng điền đầy đủ thông tin bắt buộc!");
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
  return res.status(201).json({ data: newUserAddress });
});

const updateUserAddressById = asyncHandler(async (req, res, next) => {
  const updateUserAddress = await UserAddress.findById(req.params.id);
  const { userId, city, district, commune, street, phone } = req.body;

  updateUserAddress.userId = userId || updateUserAddress.userId;
  updateUserAddress.city = city || updateUserAddress.city;
  updateUserAddress.district = district || updateUserAddress.district;
  updateUserAddress.commune = commune || updateUserAddress.commune;
  updateUserAddress.street = street || updateUserAddress.street;
  updateUserAddress.phone = phone || updateUserAddress.phone;

  await updateUserAddress.save();
  return res.status(200).json({ data: updateUserAddress });
});

const getUserAddressById = asyncHandler(async (req, res, next) => {
  const userAddress = await UserAddress.findById(req.params.id);

  if (!userAddress) return res.status(404).json({ error: "Not found" });

  res.status(200).json({ data: userAddress });
});

export default {
  createUserAddress: createUserAddress,
  updateUserAddressById: updateUserAddressById,
  getUserAddressById: getUserAddressById,
};
