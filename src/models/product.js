import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: null,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Category",
    },
    price: {
      type: Number,
      required: true,
    },
    discountPrice: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
    },
    soldQuantity: {
      type: Number,
      default: 0,
    },
    totalReview: {
      type: Number,
      default: 0,
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);
