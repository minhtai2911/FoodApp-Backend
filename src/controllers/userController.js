import User from "../models/user.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import UserRole from "../models/userRole.js";
import asyncHandler from "../middlewares/asyncHandler.js";

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

  if (!user) return res.status(404).json({ error: "Not found" });

  res.status(200).json({ data: user });
});

const updateStatusUserById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: "Not found" });

  const updateUser = await User.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        isActive: !user.isActive,
      },
    },
    { new: true }
  );
  if (!updateUser.isActive)
    return res
      .status(200)
      .json({ message: "Lưu trữ người dùng thành công!", data: updateUser });

  res
    .status(200)
    .json({ message: "Khôi phục người dùng thành công!", data: updateUser });
});

const updateUserById = async (req, res, next) => {
  try {
    const role = await UserRole.findById(req.user.roleId);
    if (req.user.id !== req.params.id && role.roleName !== "Admin") {
      if (req.file) {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        fs.unlinkSync(path.join(__dirname, "../..", req.file.path));
      }
      return res.status(403).json({
        message:
          "Bạn không có quyền truy cập vào tài nguyên này. Vui lòng liên hệ với quản trị viên.",
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      if (req.file) {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        fs.unlinkSync(path.join(__dirname, "../..", req.file.path));
      }
      return res.status(404).json({ error: "Not found" });
    }

    if (req.file) {
      if (user.avatarPath) {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const deleteStart = user.avatarPath.indexOf("/avatars");
        const deleteFile = "/public" + user.avatarPath.slice(deleteStart);

        if ("/public/avatars/avatar.jpg" != deleteFile)
          fs.unlinkSync(path.join(__dirname, "..", deleteFile));
      }
      let filePath = req.file.path.replace(/\\/g, "/");
      const start = filePath.indexOf("avatars");
      filePath = filePath.slice(start);
      const avatarPath = `${process.env.URL_SERVER}/${filePath}`;

      const newUser = await User.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            fullName: req.body.fullName || user.fullName,
            phone: req.body.phone || user.phone,
            avatarPath: avatarPath,
            roleId: req.body.roleId || user.roleId,
          },
        },
        { new: true }
      );
      return res.status(200).json({
        message: "Chỉnh sửa thông tin người dùng thành công!",
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

    res.status(200).json({
      message: "Chỉnh sửa thông tin người dùng thành công!",
      data: newUser,
    });
  } catch (err) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    fs.unlinkSync(path.join(__dirname, "../..", req.file.path));
    res.status(500).json({
      error: err.message,
      message: "Đã xảy ra lỗi, vui lòng thử lại!",
    });
  }
};

const createUser = asyncHandler(async (req, res, next) => {
  const { email, fullName, phone, password, roleName } = req.body;
  if (!email || !fullName || !phone || !password || !roleName) {
    throw new Error("Vui lòng điền đầy đủ thông tin bắt buộc!");
  }
  const exists = await User.findOne({ email: email });
  if (exists) return res.status(400).json({ message: "Email đã tồn tại." });
  const role = await UserRole.findOne({ roleName: roleName });
  if (!role) return res.status(400).json({ error: "Not found" });
  const roleId = role._id;
  const newUser = new User({ email, fullName, phone, roleId, password });
  await newUser.save();
  res
    .status(201)
    .json({ message: "Thêm người dùng thành công!", data: newUser });
});

export default {
  getAllUsers: getAllUsers,
  getUserById: getUserById,
  updateStatusUserById: updateStatusUserById,
  updateUserById: updateUserById,
  createUser: createUser,
};
