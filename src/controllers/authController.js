import User from "../models/user.js";
import UserRole from "../models/userRole.js";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import Otp from "../models/otp.js";
import { messages } from "../config/messageHelper.js";
import generateTokens from "../utils/generateToken.js";
import RefreshToken from "../models/refreshToken.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import logger from "../utils/logger.js";
import { v4 as uuidv4 } from "uuid";

const generateOTP = asyncHandler(async (req, res, next) => {
  const otp = Math.floor(100000 + Math.random() * (999999 - 100000)).toString();

  const salt = await bcrypt.genSalt();
  const hashedOTP = await bcrypt.hash(otp, salt);
  const email = req.body.email;

  const otpObj = new Otp({
    email,
    otp: hashedOTP,
  });

  await otpObj.save();
  logger.info("Tạo OTP thành công");
  res.status(200).json({ otp: otp });
});

const login = asyncHandler(async (req, res, next) => {
  const email = req.body.email;
  const originalPassword = req.body.password;

  if (!email || !originalPassword) {
    logger.warn(messages.MSG1);
    throw new Error(messages.MSG1);
  }

  const user = await User.login(email, originalPassword);
  const role = await UserRole.findById(user.roleId);

  if (!role) {
    logger.warn("Vai trò người dùng không tồn tại");
    return res.status(404).json({ error: "Not found" });
  }

  if (!user.isActive && role.roleName === "Customer") {
    logger.warn("Tài khoản chưa được xác thực");
    return res
      .status(400)
      .json({
        data: { userId: user._id, email: email },
        message: "Tài khoản chưa được xác thực!",
      });
  }

  if (!user.isActive) {
    logger.warn(messages.MSG53);
    return res.status(400).json({
      message: messages.MSG53,
    });
  }

  const { accessToken, refreshToken } = await generateTokens(user);

  logger.info(messages.MSG3, user._id);
  return res.status(200).json({
    message: messages.MSG3,
    data: { refreshToken, accessToken },
  });
});

const signup = asyncHandler(async (req, res, next) => {
  const { email, fullName, phone, password } = req.body;

  if (!email || !fullName || !phone || !password) {
    logger.warn(messages.MSG1);
    throw new Error(messages.MSG1);
  }
  const exists = await User.findOne({ email: email });

  if (exists && !exists.isGuest) {
    logger.warn(messages.MSG51);
    return res.status(409).json({ message: messages.MSG51 });
  }

  if (exists.isGuest) {
    exists.password = password;
    exists.email = email;
    exists.fullName = fullName;
    exists.phone = phone;
    exists.isGuest = false;
    exists.expiresAt = null;
    exists.save();
    logger.info(messages.MSG16);
    return res.status(201).json({ data: exists._id, message: messages.MSG16 });
  }

  const role = await UserRole.findOne({ roleName: "Customer" });

  if (!role) {
    logger.warn("Vai trò người dùng không tồn tại");
    return res.status(404).json({ error: "Not found" });
  }

  const roleId = role._id;
  const user = new User({ email, fullName, phone, roleId, password });

  await user.save();
  logger.info(messages.MSG16);
  res.status(201).json({ data: user._id, message: messages.MSG16 });
});

const sendMailVerifyAccount = asyncHandler(async (req, res, next) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const info = await transporter.sendMail({
    from: `FoodyRush <${process.env.EMAIL_USER}>`,
    to: `${req.body.email}`,
    subject: "YÊU CẦU XÁC NHẬN THÔNG TIN ĐĂNG KÝ TÀI KHOẢN TỪ FOODYRUSH`,",
    html: `
      <a href="${process.env.URL_CLIENT}/verify/${req.body.id}">Nhấn vào đây để xác nhận email của bạn.</a>
      `,
  });
  logger.info(messages.MSG4);
  res.status(200).json({ message: messages.MSG4 });
});

const verifyAccount = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    logger.warn("Người dùng không tồn tại", req.params.id);
    return res.status(404).json({ error: "Not found" });
  }

  user.isActive = true;

  await user.save();

  const { accessToken, refreshToken } = await generateTokens(user);

  logger.info("Xác thực tài khoản thành công");
  res.status(200).json({
    data: { accessToken, refreshToken },
  });
});

const logout = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    logger.warn("Refresh token null");
    return res.status(400).json({
      message: "Refresh token null",
    });
  }

  const storedToken = await RefreshToken.findOneAndDelete({
    token: refreshToken,
    userId: req.user.id,
  });

  if (!storedToken) {
    logger.warn("Refresh token không hợp lệ");
    return res.status(400).json({
      message: "Refresh token không hợp lệ",
    });
  }

  logger.info(messages.MSG7);

  res.status(200).json({ message: messages.MSG7 });
});

const refreshToken = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    logger.warn("Refresh token null");
    return res.status(400).json({
      message: "Refresh token null",
    });
  }

  const storedToken = await RefreshToken.findOne({ token: refreshToken });

  if (!storedToken) {
    logger.warn("Refresh token không hợp lệ");
    return res.status(400).json({
      message: "Refresh token không hợp lệ",
    });
  }

  if (!storedToken || storedToken.expiresAt < new Date()) {
    logger.warn("Refresh token đã quá hạn");

    return res.status(401).json({
      message: `Refresh token đã quá hạn`,
    });
  }

  const user = await User.findById(storedToken.userId);

  if (!user) {
    logger.warn("Không tìm thấy user");

    return res.status(401).json({
      message: `Không tìm thấy user`,
    });
  }

  const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
    await generateTokens(user);

  await RefreshToken.deleteOne({ _id: storedToken._id });

  logger.info("Refresh token thành công!", user._id);
  res.status(200).json({
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    },
  });
});

const sendOTP = asyncHandler(async (req, res, next) => {
  const OTP = req.body.OTP;
  const email = req.body.email;

  const user = await User.findOne({ email: email });
  if (!user) {
    logger.warn(messages.MSG8);
    return res.status(409).json({ message: messages.MSG8 });
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  const info = await transporter.sendMail({
    from: `FoodyRush <${process.env.EMAIL_USER}>`,
    to: `${email}`,
    subject: "YÊU CẦU ĐẶT LẠI MẬT KHẨU TỪ FOODYRUSH",
    html: `
      <div>Chào ${email},</div>
      <div>Chúng tôi đã nhận được yêu cầu để đặt lại mật khẩu của bạn.</div>
      <div>Mã OTP của bạn: <br>${OTP}</br></div>
      `,
  });
  logger.info(messages.MSG9);
  res.status(200).json({
    message: messages.MSG9,
  });
});

const checkOTPByEmail = asyncHandler(async (req, res, next) => {
  const otp = req.body.OTP;
  const email = req.body.email;
  const otpList = await Otp.find({ email: email });

  if (otpList.length < 1) {
    logger.warn("Không tìm thấy mã OTP.");
    return res.status(400).json({ error: "Không tìm thấy mã OTP." });
  }

  const check = await bcrypt.compare(otp, otpList[otpList.length - 1].otp);

  if (!check) {
    logger.warn(messages.MSG10);
    return res.status(400).json({ message: messages.MSG10 });
  }

  const user = await User.findOne({ email: email });

  const { accessToken, refreshToken } = await generateTokens(user);

  logger.info("Xác nhận OTP thành công!");
  res.status(200).json({ data: { accessToken, refreshToken } });
});

const forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  user.password = req.body.newPassword;
  await user.save();
  logger.info(messages.MSG11);
  res.status(200).json({ message: messages.MSG11 });
});

const resetPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  const check = await bcrypt.compare(req.body.password, user.password);

  if (!check) {
    logger.warn(messages.MSG13);
    return res.status(400).json({ message: messages.MSG13 });
  }

  user.password = req.body.newPassword;
  await user.save();
  logger.info(messages.MSG14);
  res.status(200).json({ message: messages.MSG14 });
});

const loginGoogleSuccess = asyncHandler(async (req, res, next) => {
  const token = req.body.token;
  const data = await req.redisClient.get(token);

  if (!data) {
    logger.warn("Token expired!");
    return res.status(403).json({
      message: "Token expired!",
    });
  }

  logger.info("Xác thực token thành công!");
  return res.status(200).json({ data: JSON.parse(data) });
});

const createGuestAccount = asyncHandler(async (req, res, next) => {
  const { email, fullName, phone } = req.body;

  if (!email || !fullName || !phone) {
    logger.warn(messages.MSG1);
    throw new Error(messages.MSG1);
  }

  let user = await User.findOne({ email: email });

  if (!user) {
    const role = await UserRole.findOne({ roleName: "Customer" });

    if (!role) {
      logger.warn("Vai trò không tồn tại");
      throw new Error("Not found");
    }

    user = new User({
      email: email,
      fullName: fullName,
      phone: phone,
      roleId: role.id,
    });

    await user.save();
  }

  await User.findByIdAndUpdate(
    user._id,
    {
      $set: {
        isGuest: true,
      },
    },
    { new: true }
  );

  const { accessToken, refreshToken } = await generateTokens(user);

  logger.info("Tạo tài khoản khách thành công!");
  res.status(201).json({ data: { accessToken, refreshToken } });
});

export default {
  login: login,
  signup: signup,
  logout: logout,
  refreshToken: refreshToken,
  generateOTP: generateOTP,
  sendOTP: sendOTP,
  checkOTPByEmail: checkOTPByEmail,
  forgotPassword: forgotPassword,
  resetPassword: resetPassword,
  verifyAccount: verifyAccount,
  sendMailVerifyAccount: sendMailVerifyAccount,
  loginGoogleSuccess: loginGoogleSuccess,
  createGuestAccount: createGuestAccount,
};
