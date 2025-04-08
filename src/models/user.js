import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      validate: (value) => {
        return validator.isEmail(value);
      },
    },
    fullName: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      validate: (value) => {
        return validator.isMobilePhone(value, "vi-VN");
      },
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      require: true,
      ref: "UserRole",
    },
    password: {
      type: String,
    },
    googleId: {
      type: String,
      unique: true,
    },
    avatarPath: {
      type: String,
      default: `https://res.cloudinary.com/dffy6tds8/image/upload/v1744127926/avatar_kn6ynb.jpg`,
    },
    publicId: {
      type: String,
      default: `avatar_kn6ynb`,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (this.password) {
    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

userSchema.statics.login = async function (email, password) {
  try {
    const user = await this.findOne({ email });
    if (!user) {
      throw new Error(
        "Thông tin đăng nhập không chính xác. Vui lòng kiểm tra lại tên đăng nhập và mật khẩu."
      );
    }

    const check = await bcrypt.compare(password, user.password);
    if (!check) {
      throw new Error(
        "Thông tin đăng nhập không chính xác. Vui lòng kiểm tra lại tên đăng nhập và mật khẩu."
      );
    }

    return user;
  } catch (err) {
    throw new Error(
      "Thông tin đăng nhập không chính xác. Vui lòng kiểm tra lại tên đăng nhập và mật khẩu."
    );
  }
};

export default mongoose.model("User", userSchema);
