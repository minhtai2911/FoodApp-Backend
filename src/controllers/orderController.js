import Order from "../models/order.js";
import mongoose from "mongoose";
import asyncHandler from "../middlewares/asyncHandler.js";

const getAllOrders = asyncHandler(async (req, res, next) => {
  const query = {};

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  if (req.query.status) query["deliveryInfo.status"] = req.query.status;
  if (req.query.paymentMethod) query.paymentMethod = req.query.paymentMethod;
  if (req.query.paymentStatus) query.paymentStatus = req.query.paymentStatus;

  const pipeline = [
    { $match: query },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "userInfo",
      },
    },
    { $unwind: "$userInfo" },
    { $skip: skip },
    { $limit: limit },
  ];

  if (req.query.search) {
    pipeline.push({
      $match: {
        "userInfo.fullName": { $regex: req.query.search, $options: "i" },
      },
    });
  }

  pipeline.push({
    $project: {
      status: 1,
      paymentMethod: 1,
      paymentStatus: 1,
      "userInfo.fullName": 1,
      deliveryInfo: 1,
      finalPrice: 1,
      createdAt: 1,
    },
  });

  const totalCount = await Order.countDocuments(query);
  const orders = await Order.aggregate(pipeline);

  res.status(200).json({
    meta: {
      totalCount: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    },
    data: orders,
  });
});

const getAllOrdersByUserId = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const userId = req.user.id;

  const totalCount = await Order.countDocuments({ userId: userId });
  const orders = await Order.find(
    { userId: userId },
    {
      paymentMethod: 1,
      finalPrice: 1,
      expectedDeliveryDate: 1,
      orderItems: 1,
      paymentStatus: 1,
    }
  )
    .skip(skip)
    .limit(limit)
    .exec();

  return res.status(200).json({
    meta: {
      totalCount: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    },
    data: orders,
  });
});

const getOrderById = asyncHandler(async (req, res, next) => {
  const pipeline = [
    { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "userInfo",
      },
    },
    { $unwind: "$userInfo" },
  ];

  pipeline.push({
    $project: {
      orderItems: 1,
      status: 1,
      paymentMethod: 1,
      paymentStatus: 1,
      "userInfo.fullName": 1,
      deliveryInfo: 1,
      finalPrice: 1,
      createdAt: 1,
    },
  });

  const order = await Order.aggregate(pipeline);

  if (!order) return res.status(404).json({ error: "Not found" });

  res.status(200).json({ data: order });
});

const createOrder = asyncHandler(async (req, res, next) => {
  const {
    orderItems,
    discount,
    userAddressId,
    shippingFee,
    paymentMethod,
    deliveryInfo,
    expectedDeliveryDate,
  } = req.body;

  const userId = req.user.id;

  if (
    !orderItems ||
    orderItems.length === 0 ||
    !userAddressId ||
    !paymentMethod
  )
    throw new Error("Vui lòng điền đầy đủ thông tin bắt buộc!");

  const totalPrice = orderItems.reduce((acc, item) => {
    return acc + item.price * item.quantity;
  }, 0);

  const finalPrice = totalPrice - (totalPrice * discount) / 100 + shippingFee;

  const newOrder = new Order({
    userId,
    orderItems,
    totalPrice,
    discount,
    finalPrice,
    userAddressId,
    shippingFee,
    paymentStatus,
    paymentMethod,
    deliveryInfo,
    expectedDeliveryDate,
  });

  await newOrder.save();
  res.status(201).json({ message: "Đặt hàng thành công!", data: newOrder });
});

const updateDeliveryInfoById = asyncHandler(async (req, res, next) => {
  const orderId = req.params.id;
  const { status, deliveryAddress, expectedDeliveryDate } = req.body;
  const order = await Order.findById(orderId);

  order.expectedDeliveryDate =
    expectedDeliveryDate || order.expectedDeliveryDate;
  order.deliveryInfo.push({
    status,
    deliveryAddress,
  });

  if (status === "Đã giao" && order.paymentStatus === "Đã thanh toán") {
    addOrderToReport(order.finalPrice);
  }

  await order.save();
  res
    .status(200)
    .json({
      message: "Thông tin theo dõi đơn hàng đã được cập nhật!",
      data: order,
    });
});

const updatePaymentStatusById = asyncHandler(async (req, res, next) => {
  const orderId = req.params.id;
  const { paymentStatus } = req.body;
  const order = await Order.findById(orderId);

  order.paymentStatus = paymentStatus;
  await order.save();
  res
    .status(200)
    .json({
      message: "Cập nhật trạng thái thanh toán thành công!",
      data: order,
    });
});

const checkoutWithMoMo = asyncHandler(async (req, res, next) => {
  const accessKey = "F8BBA842ECF85";
  const secretKey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
  const orderInfo = "Checkout with MoMo";
  const partnerCode = "MOMO";
  const redirectUrl = `${process.env.URL_CLIENT}/orderCompleted`;
  const ipnUrl = `${process.env.LINK_NGROK}/api/v1/paymentDetail/callback`;
  const requestType = "payWithMethod";
  const amount = req.body.amount;
  const orderId = req.body.orderId;
  const requestId = orderId;
  const extraData = "";
  const orderGroupId = "";
  const autoCapture = true;
  const lang = "vi";

  let rawSignature =
    "accessKey=" +
    accessKey +
    "&amount=" +
    amount +
    "&extraData=" +
    extraData +
    "&ipnUrl=" +
    ipnUrl +
    "&orderId=" +
    orderId +
    "&orderInfo=" +
    orderInfo +
    "&partnerCode=" +
    partnerCode +
    "&redirectUrl=" +
    redirectUrl +
    "&requestId=" +
    requestId +
    "&requestType=" +
    requestType;

  let signature = crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");

  const requestBody = JSON.stringify({
    partnerCode: partnerCode,
    partnerName: "Test",
    storeId: "MomoTestStore",
    requestId: requestId,
    amount: amount,
    orderId: orderId,
    orderInfo: orderInfo,
    redirectUrl: redirectUrl,
    ipnUrl: ipnUrl,
    lang: lang,
    requestType: requestType,
    autoCapture: autoCapture,
    extraData: extraData,
    orderGroupId: orderGroupId,
    signature: signature,
  });

  const options = {
    method: "POST",
    url: "https://test-payment.momo.vn/v2/gateway/api/create",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(requestBody),
    },
    data: requestBody,
  };

  const response = await axios(options);
  res.status(200).json(response.data);
});

const callbackMoMo = async (req, res, next) => {
  try {
    if (req.body.resultCode === 0) {
      const order = await Order.findById({ _id: req.body.orderId });

      if (!order) throw new Error("Not found");

      order.paymentStatus = "Đã thanh toán";
      order.save();
    }
  } catch (err) {
    throw new Error({
      error: err.message,
      message: "Đã xảy ra lỗi, vui lòng thử lại!",
    });
  }
};

const checkStatusTransaction = asyncHandler(async (req, res, next) => {
  const accessKey = "F8BBA842ECF85";
  const secretKey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
  const orderId = req.body.orderId;
  const partnerCode = "MOMO";

  const rawSignature = `accessKey=${accessKey}&orderId=${orderId}&partnerCode=${partnerCode}&requestId=${orderId}`;

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");

  const requestBody = JSON.stringify({
    partnerCode: "MOMO",
    requestId: orderId,
    orderId: orderId,
    signature: signature,
    lang: "vi",
  });

  const options = {
    method: "POST",
    url: "https://test-payment.momo.vn/v2/gateway/api/query",
    headers: {
      "Content-Type": "application/json",
    },
    data: requestBody,
  };

  const response = await axios(options);

  if (response.data.resultCode === 0) {
    const order = await Order.findById({ _id: req.body.orderId });

    if (!order) return res.status(404).json();

    order.paymentStatus = "Đã thanh toán";
    order.save();
    return res.status(200).json();
  } else {
    return res.status(200).json();
  }
});

export default {
  getAllOrders: getAllOrders,
  getOrderById: getOrderById,
  createOrder: createOrder,
  getAllOrdersByUserId: getAllOrdersByUserId,
  updateDeliveryInfoById: updateDeliveryInfoById,
  updatePaymentStatusById: updatePaymentStatusById,
  checkoutWithMoMo: checkoutWithMoMo,
  callbackMoMo: callbackMoMo,
  checkStatusTransaction: checkStatusTransaction,
};
