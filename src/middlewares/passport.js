import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import User from "../models/user.js";
import jwt from "jsonwebtoken";
import UserRole from "../models/userRole.js";

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:8000/api/v1/auth/google/callback",
      passReqToCallback: true,
    },
    async (request, accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ email: profile.emails[0].value });
        if (!user) {
          const role = await UserRole.findOne({ roleName: "Customer" });
          if (!role) {
            throw new Error("Vai trò không tồn tại.");
          }
          user = new User({
            email: profile.emails[0].value,
            fullName: profile.displayName,
            roleId: role.id,
            password: profile.id,
            isActive: true,
            imgURL: profile.photos[0].value,
          });
          await user.save();
        }
        const accessToken = jwt.sign(
          { id: user._id, roleId: user.roleId },
          process.env.ACCESS_TOKEN_SECRET,
          {
            expiresIn: "30s",
          }
        );
        const refreshToken = jwt.sign(
          { id: user._id, roleId: user.roleId },
          process.env.REFRESH_TOKEN_SECRET,
          { expiresIn: "365d" }
        );
        await User.findByIdAndUpdate(
          user._id,
          {
            $set: { refreshToken: refreshToken },
          },
          { new: true }
        );
        done(null, { ...user, accessToken });
      } catch {
        done(null, false);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

export default passport;
