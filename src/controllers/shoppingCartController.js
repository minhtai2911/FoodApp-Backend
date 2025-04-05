import ShoppingCart from "../models/shoppingCart.js";
import asyncHandler from "../middlewares/asyncHandler.js";

const getShoppingCartById = asyncHandler(async (req, res, next) => {
  const shoppingCart = await ShoppingCart.findById(req.params.id);
  if (!shoppingCart) return res.status(404).json({ error: "Not found" });
  res.status(200).json({ data: shoppingCart });
});

const getShoppingCartByUserId = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const userId = req.user.id;

  const totalCount = await ShoppingCart.countDocuments({ userId: userId });
  const shoppingCart = await ShoppingCart.find({ userId: userId })
    .populate("productId")
    .skip(skip)
    .limit(limit)
    .exec();

  res.status(200).json({
    meta: {
      totalCount: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    },
    data: shoppingCart,
  });
});

const createShoppingCart = asyncHandler(async (req, res, next) => {
  const { productId, quantity } = req.body;
  const userId = req.user.id;

  if (!userId || !productId || !quantity) {
    throw new Error("Vui lòng điền đầy đủ thông tin bắt buộc!");
  }

  const existingShoppingCart = await ShoppingCart.findOne({
    userId,
    productId,
  });

  if (existingShoppingCart) {
    existingShoppingCart.quantity += quantity;
    await existingShoppingCart.save();
    return res.status(200).json({
      message: "Sản phẩm đã được thêm vào giỏ hàng!",
      data: existingShoppingCart,
    });
  }

  const newShoppingCart = new ShoppingCart({
    userId,
    productVariantId,
    quantity,
  });

  await newShoppingCart.save();
  res.status(201).json({
    message: "Sản phẩm đã được thêm vào giỏ hàng!",
    data: newShoppingCart,
  });
});

const updateShoppingCartQuantityById = asyncHandler(async (req, res, next) => {
  const shoppingCart = await ShoppingCart.findById(req.params.id);

  if (!shoppingCart) return res.status(404).json({ error: "Not found" });

  shoppingCart.quantity = req.body.quantity || shoppingCart.quantity;
  await shoppingCart.save();
  res.status(200).json({ data: shoppingCart });
});

const deleteShoppingCartById = asyncHandler(async (req, res, next) => {
  const shoppingCart = await ShoppingCart.findByIdAndDelete(req.params.id);

  if (!shoppingCart) res.status(404).json({ error: "Not found" });

  res.status(200).json({ message: "Sản phẩm đã được xóa khỏi giỏ hàng!" });
});

export default {
  getShoppingCartById: getShoppingCartById,
  getShoppingCartByUserId: getShoppingCartByUserId,
  createShoppingCart: createShoppingCart,
  updateShoppingCartQuantityById: updateShoppingCartQuantityById,
  deleteShoppingCartById: deleteShoppingCartById,
};
