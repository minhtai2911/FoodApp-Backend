import UserRole from "../models/userRole.js";
import asyncHandler from "../middlewares/asyncHandler.js";

const getAllUserRoles = asyncHandler(async (req, res, next) => {
  const query = {};
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  if (req.query.search) query.roleName = new RegExp(req.query.search, "i");

  const totalCount = await UserRole.countDocuments(query);
  const userRoles = await UserRole.find(query).skip(skip).limit(limit).exec();

  res.status(200).json({
    meta: {
      totalCount: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    },
    data: userRoles,
  });
});

const getUserRoleById = asyncHandler(async (req, res, next) => {
  const userRole = await UserRole.findById(req.params.id);

  if (!userRole) return res.status(404).json({ error: "Not found" });

  res.status(200).json({ data: userRole });
});

export default {
  getAllUserRoles: getAllUserRoles,
  getUserRoleById: getUserRoleById,
};
