import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
dotenv.config();

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
      required: true,
    },
    avatarPath: {
      type: String,
      default: `${process.env.URL_SERVER}/avatars/avatar.jpg`,
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
  const user = await this.findOne({ email });
  if (user) {
    const auth = await bcrypt.compare(password, user.password);
    if (auth) {
      return user;
    }
    throw new Error(
      "Thông tin đăng nhập không chính xác. Vui lòng kiểm tra lại tên đăng nhập và mật khẩu."
    );
  }
  throw new Error(
    "Thông tin đăng nhập không chính xác. Vui lòng kiểm tra lại tên đăng nhập và mật khẩu."
  );
};

export default mongoose.model("User", userSchema);
