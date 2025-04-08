import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import User from "../models/user.js";
import UserRole from "../models/userRole.js";
import generateTokens from "../utils/generateToken.js";

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:8000/api/v1/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ email: profile.emails[0].value });

        if (!user) {
          const role = await UserRole.findOne({ roleName: "Customer" });
          if (!role) {
            throw new Error("Not found");
          }
          user = new User({
            email: profile.emails[0].value,
            fullName: profile.displayName,
            roleId: role.id,
            avatarPath: profile.photos[0].value,
          });
          await user.save();
        }

        await User.findByIdAndUpdate(
          user._id,
          {
            $set: {
              googleId: profile.id,
            },
          },
          { new: true }
        );

        const { accessToken, refreshToken } = await generateTokens(user);

        done(null, { accessToken, refreshToken });
      } catch (err) {
        console.log(err.message);
        done(null, false);
      }
    }
  )
);

export default passport;
