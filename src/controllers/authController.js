import User from "../models/user.js";
import UserRole from "../models/userRole.js";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import Otp from "../models/otp.js";
import generateTokens from "../utils/generateToken.js";
import RefreshToken from "../models/refreshToken.js";
import asyncHandler from "../middlewares/asyncHandler.js";

const generateOTP = async (req, res, next) => {
  try {
    const otp = Math.floor(
      100000 + Math.random() * (999999 - 100000)
    ).toString();

    const salt = await bcrypt.genSalt();
    const hashedOTP = await bcrypt.hash(otp, salt);
    const email = req.body.email;

    const otpObj = new Otp({
      email,
      otp: hashedOTP,
    });

    await otpObj.save();
    res.status(200).json({ otp: otp });
  } catch (err) {
    res.status(500).json({
      error: err.message,
      message: "Đã xảy ra lỗi, vui lòng thử lại!",
    });
  }
};

const login = asyncHandler(async (req, res, next) => {
  const email = req.body.email;
  const originalPassword = req.body.password;

  if (!email || !originalPassword) {
    throw new Error("Vui lòng điền đầy đủ thông tin bắt buộc!");
  }

  const user = await User.login(email, originalPassword);
  const role = await UserRole.findById(user.roleId);

  if (!user.isActive && role.roleName === "Customer") {
    return res.status(400).json({ data: user.email });
  }

  if (!user.isActive) {
    return res.status(400).json({
      message:
        "Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ với quản trị viên.",
    });
  }

  const { accessToken, refreshToken } = await generateTokens(user);

  return res.status(200).json({
    message: "Đăng nhập thành công!",
    data: { refreshToken, accessToken },
  });
});

const signup = asyncHandler(async (req, res, next) => {
  const { email, fullName, phone, password } = req.body;

  if (!email || !fullName || !phone || !password) {
    throw new Error("Vui lòng điền đầy đủ thông tin bắt buộc!");
  }
  const exists = await User.findOne({ email: email });

  if (exists) return res.status(409).json({ message: "Email đã tồn tại." });

  const role = await UserRole.findOne({ roleName: "Customer" });
  const roleId = role._id;
  const user = new User({ email, fullName, phone, roleId, password });

  await user.save();
  res.status(201).json({ message: "Đăng ký thành công!" });
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
    from: `FOOD APP <${process.env.EMAIL_USER}>`,
    to: `${req.body.email}`,
    subject: "YÊU CẦU XÁC NHẬN THÔNG TIN ĐĂNG KÝ TÀI KHOẢN TỪ FOOD APP",
    html: `
      <a href="${process.env.URL_CLIENT}/verify/${req.body.id}">Nhấn vào đây để xác nhận email của bạn.</a>
      `,
  });
  res
    .status(200)
    .json({ message: "Liên kết xác thực đã được gửi thành công!" });
});

const verifyAccount = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) return res.status(404).json({ error: "Not found" });

  user.isActive = true;

  const { accessToken, refreshToken } = await generateTokens(user);

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
  });

  if (!storedToken) {
    logger.warn("Refresh token không hợp lệ");
    return res.status(400).json({
      message: "Refresh token không hợp lệ",
    });
  }

  logger.info("Đăng xuất thành công!");

  res.status(200).json({ message: "Đăng xuất thành công!" });
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

  res.status(200).json({
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  });
  logger.info("Refresh Token thành công!", user._id);
});

const sendOTP = asyncHandler(async (req, res, next) => {
  const OTP = req.body.OTP;
  const email = req.body.email;
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
    from: `FOOD APP <${process.env.EMAIL_USER}>`,
    to: `${email}`,
    subject: "YÊU CẦU ĐẶT LẠI MẬT KHẨU TỪ FOOD APP",
    html: `
      <div>Chào ${email},</div>
      <div>Chúng tôi đã nhận được yêu cầu để đặt lại mật khẩu của bạn.</div>
      <div>Mã OTP của bạn: <br>${OTP}</br></div>
      `,
  });
  res.status(200).json({
    message: "Mã OTP đã được gửi thành công!",
  });
});

const checkOTPByEmail = asyncHandler(async (req, res, next) => {
  const otp = req.body.OTP;
  const email = req.body.email;
  const otpList = await Otp.find({ email: email });

  if (otpList.length < 1) {
    return res.status(400).json({ error: "Không tìm thấy mã OTP." });
  }

  const check = await bcrypt.compare(otp, otpList[otpList.length - 1].otp);

  if (!check) {
    return res.status(400).json({ message: "Mã OTP không hợp lệ!" });
  }

  const user = await User.findOne({ email: email });

  const { accessToken, refreshToken } = await generateTokens(user);

  res.status(200).json({ data: { accessToken, refreshToken } });
});

const checkEmail = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return res.status(404).json({ message: "Email không tồn tại." });
  }

  res.status(200).json({ message: "Email đã tồn tại." });
});

const forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  user.password = req.body.newPassword;
  await user.save();
  res.status(200).json({ message: "Đặt lại mật khẩu thành công!" });
});

const resetPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  const check = await bcrypt.compare(req.body.password, user.password);

  if (!check)
    return res
      .status(400)
      .json({ message: "Mật khẩu cũ không đúng. Vui lòng thử lại!" });

  user.password = req.body.newPassword;
  await user.save();
  res.status(200).json({ message: "Đổi mật khẩu thành công!" });
});

const loginGoogleSuccess = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) return res.status(404).json({ error: "Not found" });

  const check = await bcrypt.compare(user._id.toString(), req.body.token);

  if (!check)
    return res.status(403).json({
      message: "Token đã quá hạn",
    });

  const { password, ...data } = user._doc;
  res.status(200).json({ data });
});

export default {
  login: login,
  signup: signup,
  logout: logout,
  refreshToken: refreshToken,
  generateOTP: generateOTP,
  sendOTP: sendOTP,
  checkOTPByEmail: checkOTPByEmail,
  checkEmail: checkEmail,
  forgotPassword: forgotPassword,
  resetPassword: resetPassword,
  verifyAccount: verifyAccount,
  sendMailVerifyAccount: sendMailVerifyAccount,
  loginGoogleSuccess: loginGoogleSuccess,
};
