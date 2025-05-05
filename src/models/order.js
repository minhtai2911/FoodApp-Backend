import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    orderItems: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: "Product",
        },
        productVariantId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: "ProductVariant",
        },
        quantity: {
          type: Number,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
      },
    ],
    totalPrice: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      default: 0,
    },
    finalPrice: {
      type: Number,
      required: true,
    },
    userAddressId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "UserAddress",
    },
    shippingFee: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      default: "Chưa thanh toán",
      enum: ["Đã thanh toán", "Chưa thanh toán", "Đã hoàn tiền"],
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    deliveryInfo: [
      {
        status: {
          type: String,
          default: "Đang chờ",
          enum: [
            "Đang chờ",
            "Đang xử lý",
            "Đã giao",
            "Đang giao",
            "Đã hủy bởi người mua",
            "Đã hủy bởi người bán",
            "Đã trả hàng",
            "Đã nhận đơn",
            "Trả hàng",
          ],
        },
        deliveryAddress: {
          type: String,
          default: null,
        },
        deliveryDate: {
          type: Date,
          default: Date.now(),
        },
      },
    ],
    expectedDeliveryDate: {
      type: Date,
      default: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
