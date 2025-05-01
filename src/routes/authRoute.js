import { Router } from "express";
import authController from "../controllers/authController.js";
import passport from "../middlewares/passport.js";
import dotenv from "dotenv";
import authMiddleware from "../middlewares/authMiddleware.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import generateTokens from "../utils/generateToken.js";
import bcrypt from "bcrypt";

const router = Router();
dotenv.config();

router.post("/login", authController.login);
router.post("/createGuestAccount", authController.createGuestAccount)
router.post("/signup", authController.signup);
router.post("/logout", authMiddleware.verifyToken, authController.logout);
router.post("/refreshToken", authController.refreshToken);
router.post("/generateOTP", authController.generateOTP);
router.post("/sendOTP", authController.sendOTP);
router.post("/checkOTPByEmail", authController.checkOTPByEmail);
router.post(
  "/forgotPassword",
  authMiddleware.verifyToken,
  authController.forgotPassword
);
router.post(
  "/resetPassword",
  authMiddleware.verifyToken,
  authController.resetPassword
);
router.get("/verifyAccount/:id", authController.verifyAccount);
router.post("/sendMailVerifyAccount", authController.sendMailVerifyAccount);
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.URL_CLIENT}/login`,
  }),
  asyncHandler(async (req, res) => {
    const user = req.user;
    const salt = await bcrypt.genSalt();
    const token = await bcrypt.hash(user._id.toString(), salt);
    const cacheKey = token;

    const { accessToken, refreshToken } = await generateTokens(user);

    await req.redisClient.setex(
      cacheKey,
      300,
      JSON.stringify({ accessToken, refreshToken })
    );

    res.redirect(`${process.env.URL_CLIENT}/loginGoogle/success/${token}`);
  })
);

router.post("/loginGoogleSuccess", authController.loginGoogleSuccess);

export default router;
