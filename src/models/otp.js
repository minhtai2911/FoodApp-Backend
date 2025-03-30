import mongoose from "mongoose";
import validator from "validator";

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    validate: (value) => {
      return validator.isEmail(value);
    },
  },
  otp: {
    type: String,
    required: true,
  },
  time: {
    type: Date,
    default: Date.now,
    index: { expires: "60s" },
  },
});

export default mongoose.model("OTP", otpSchema);
