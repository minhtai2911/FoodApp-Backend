import jwt from "jsonwebtoken";
import RefreshToken from "../models/refreshToken.js";

const generateTokens = async (user) => {
  const accessToken = jwt.sign(
    {
      id: user._id,
      roleId: user.roleId,
      avatarPath: user.avatarPath,
      publicId: user.publicId,
      fullName: user.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "60m" }
  );

  const refreshToken = jwt.sign(
    {
      id: user._id,
      roleId: user.roleId,
      avatarPath: user.avatarPath,
      publicId: user.publicId,
      fullName: user.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await RefreshToken.create({
    token: refreshToken,
    userId: user._id,
    expiresAt,
  });

  return { accessToken, refreshToken };
};

export default generateTokens;
