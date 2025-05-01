import User from "../models/user.js";
import UserRole from "../models/userRole.js";
import { messages } from "../config/messageHelper.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import cloudinary from "../utils/cloudinary.js";
import logger from "../utils/logger.js";

const getAllUsers = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const query = {};
  if (req.query.isActive) query.isActive = req.query.isActive;

  const searchRegex = req.query.search
    ? new RegExp(req.query.search, "i")
    : null;

  const pipeline = [
    {
      $lookup: {
        from: "userroles",
        localField: "roleId",
        foreignField: "_id",
        as: "userRoleInfo",
      },
    },
    { $unwind: "$userRoleInfo" },
    {
      $match: {
        ...(req.query.roleName && {
          "userRoleInfo.roleName": req.query.roleName,
        }),
        ...(req.query.isActive && {
          isActive: req.query.isActive === "true",
        }),
        ...(searchRegex && {
          $or: [{ fullName: searchRegex }, { email: searchRegex }],
        }),
      },
    },
    { $skip: skip },
    { $limit: limit },
  ];

  const totalCountPipeline = [...pipeline];
  totalCountPipeline.splice(-2);
  const totalCount = await User.aggregate([
    ...totalCountPipeline,
    { $count: "count" },
  ]);

  const user = await User.aggregate(pipeline);

  logger.info("Lấy danh sách người dùng thành công", { ...query, page, limit });
  return res.status(200).json({
    meta: {
      totalCount: totalCount[0]?.count || 0,
      currentPage: page,
      totalPages: Math.ceil((totalCount[0]?.count || 0) / limit),
    },
    data: user,
  });
});

const getUserById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id).populate("roleId");

  if (!user) {
    logger.warn("Người dùng không tồn tại");
    return res.status(404).json({ error: "Not found" });
  }

  logger.info("Lấy người dùng thành công!");
  res.status(200).json({ data: user });
});

const updateStatusUserById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    logger.warn("Người dùng không tồn tại");
    return res.status(404).json({ error: "Not found" });
  }

  const updateUser = await User.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        isActive: !user.isActive,
      },
    },
    { new: true }
  );

  if (!updateUser.isActive) {
    logger.info(messages.MSG27);
    return res.status(200).json({ message: messages.MSG27, data: updateUser });
  }

  logger.info(messages.MSG58);
  res.status(200).json({ message: messages.MSG58, data: updateUser });
});

const updateUserById = asyncHandler(async (req, res, next) => {
  if (req.user.id !== req.params.id && req.user.roleName !== "Admin") {
    logger.warn(
      "Bạn không có quyền truy cập vào tài nguyên này. Vui lòng liên hệ với quản trị viên."
    );
    return res.status(403).json({
      message:
        "Bạn không có quyền truy cập vào tài nguyên này. Vui lòng liên hệ với quản trị viên.",
    });
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    logger.warn("Người dùng không tồn tại");
    return res.status(404).json({ error: "Not found" });
  }

  if (req.file) {
    if (user.publicId != "avatar_kn6ynb") {
      await cloudinary.deleteImageFromCloudinary(user.publicId);
    }

    const avatarPath = await cloudinary.uploadImageToCloudinary(req.file.path);

    const newUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          fullName: req.body.fullName || user.fullName,
          phone: req.body.phone || user.phone,
          avatarPath: avatarPath.url,
          publicId: avatarPath.public_id,
          roleId: req.body.roleId || user.roleId,
        },
      },
      { new: true }
    );

    logger.info(messages.MSG23);
    return res.status(200).json({
      message: messages.MSG23,
      data: newUser,
    });
  }

  const newUser = await User.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        fullName: req.body.fullName || user.fullName,
        phone: req.body.phone || user.phone,
        roleId: req.body.roleId || user.roleId,
      },
    },
    { new: true }
  );

  logger.info(messages.MSG23);
  res.status(200).json({
    message: messages.MSG23,
    data: newUser,
  });
});

const createUser = asyncHandler(async (req, res, next) => {
  const { email, fullName, phone, password, roleName } = req.body;

  if (!email || !fullName || !phone || !password || !roleName) {
    logger.warn(messages.MSG1);
    throw new Error(messages.MSG1);
  }

  const exists = await User.findOne({ email: email });

  if (exists.password) {
    logger.warn(messages.MSG51);
    return res.status(400).json({ message: messages.MSG51 });
  }

  const role = await UserRole.findOne({ roleName: roleName });
  if (!role) {
    logger.warn("Vai trò người dùng không tồn tại");
    return res.status(400).json({ error: "Not found" });
  }

  const roleId = role._id;
  const newUser = new User({ email, fullName, phone, roleId, password });
  await newUser.save();
  logger.info(messages.MSG22);
  res.status(201).json({ message: messages.MSG22, data: newUser });
});

export default {
  getAllUsers: getAllUsers,
  getUserById: getUserById,
  updateStatusUserById: updateStatusUserById,
  updateUserById: updateUserById,
  createUser: createUser,
};
