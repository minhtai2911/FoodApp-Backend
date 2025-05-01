import mongoose from "mongoose";

const productVariantSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Product",
    },
    size: {
      type: String,
      required: true,
    },
    stock: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("ProductVariant", productVariantSchema);
