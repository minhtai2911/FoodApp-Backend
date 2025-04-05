import { Router } from "express";
import authController from "../controllers/authController.js";
import passport from "../middlewares/passport.js";
import dotenv from "dotenv";
import authMiddleware from "../middlewares/authMiddleware.js";
import bcrypt from "bcrypt";

const router = Router();
dotenv.config();

router.post("/login", authController.login);
router.post("/signup", authController.signup);
router.post("/logout", authMiddleware.verifyToken, authController.logout);
router.post("/refreshToken", authController.refreshToken);
router.post("/generateOTP", authController.generateOTP);
router.post("/sendOTP", authController.sendOTP);
router.post("/checkOTPByEmail", authController.checkOTPByEmail);
router.post("/checkEmail", authController.checkEmail);
router.post("/forgotPassword", authMiddleware.verifyToken, authController.forgotPassword);
router.post("/resetPassword", authMiddleware.verifyToken, authController.resetPassword);
router.get("/verifyAccount/:id", authController.verifyAccount);
router.post("/sendMailVerifyAccount", authController.sendMailVerifyAccount);
router.get(
  "/google",
  passport.authenticate("google", { scope: ["email", "profile"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.URL_CLIENT}/login`,
  }),
  async (req, res) => {
    const salt = await bcrypt.genSalt();
    const token = await bcrypt.hash(req.user._doc._id.toString(), salt);
    const email = req.user._doc.email;
    res.redirect(`${process.env.URL_CLIENT}/success/${email}/${token}`);
  }
);

router.post("/loginGoogleSuccess", authController.loginGoogleSuccess);

export default router;
