import nodemailer from "nodemailer";
import deliveryInfoComponent from "../config/deliveryInfoComponent.js";

const sendDeliveryInfo = async (email, order) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const htmlDeliveryInfo = await deliveryInfoComponent(order);

    const info = await transporter.sendMail({
      from: `FoodyRush <${process.env.EMAIL_USER}>`,
      to: `${email}`,
      subject: `THÔNG TIN ĐƠN HÀNG ${order._id} CỦA BẠN ĐÃ ĐƯỢC CẬP NHẬT - FOODYRUSH`,
      html: htmlDeliveryInfo,
    });
  } catch (err) {
    throw new Error(err.message);
  }
};

export default sendDeliveryInfo;
