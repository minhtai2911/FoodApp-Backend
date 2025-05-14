import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/user.js";
import UserRole from "../models/userRole.js";
import dotenv from "dotenv";
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
            isActive: true,
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

        done(null, user);
      } catch (err) {
        console.log(err.message);
        done(null, false);
      }
    }
  )
);

export default passport;
