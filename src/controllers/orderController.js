import Order from "../models/order.js";
import chatbotController from "./chatbotController.js";
import { messages } from "../config/messageHelper.js";
import mongoose from "mongoose";
import { paymentStatus } from "../config/paymentStatus.js";
import { orderStatus } from "../config/orderStatus.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import sendDeliveryInfo from "../utils/sendDeliveryInfo.js";
import logger from "../utils/logger.js";
import axios from "axios";
import {
  MoMoStrategy,
  VnPayStrategy,
  ZaloPayStrategy,
  PaymentContext,
} from "../services/paymentService.js";
import {
  OrderService,
  PendingState,
  AcceptedState,
  ProcessingState,
  ShippedState,
  InDeliveryState,
  CancelledCustomerState,
  CancelledEmployeeState,
} from "../services/orderService.js";

const moMoStrategy = new MoMoStrategy();
const vnPayStrategy = new VnPayStrategy();
const zaloPayStrategy = new ZaloPayStrategy();
const paymentContext = new PaymentContext();

const getAllOrders = asyncHandler(async (req, res, next) => {
  const query = {};

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

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

  const totalCountPipeline = [
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
  ];

  if (req.query.search) {
    pipeline.push({
      $match: {
        "userInfo.fullName": { $regex: req.query.search, $options: "i" },
      },
    });

    totalCountPipeline.push({
      $match: {
        "userInfo.fullName": { $regex: req.query.search, $options: "i" },
      },
    });
  }

  if (req.query.status) {
    pipeline.push(
      {
        $addFields: {
          lastStatus: { $last: "$deliveryInfo.status" },
        },
      },
      ...(req.query.status
        ? [{ $match: { lastStatus: req.query.status } }]
        : [])
    );

    totalCountPipeline.push(
      {
        $addFields: {
          lastStatus: { $last: "$deliveryInfo.status" },
        },
      },
      ...(req.query.status
        ? [{ $match: { lastStatus: req.query.status } }]
        : [])
    );
  }

  totalCountPipeline.push({ $count: "count" });

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

  const totalResult = await Order.aggregate(totalCountPipeline);
  const totalCount = totalResult[0]?.count || 0;
  const orders = await Order.aggregate(pipeline);

  logger.info("Lấy danh sách đơn hàng thành công!", { ...query, page, limit });
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
      deliveryInfo: 1,
      userAddressId: 1,
    }
  )
    .skip(skip)
    .limit(limit)
    .exec();

  logger.info("Lấy danh sách đơn hàng thành công!", { userId, page, limit });
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
      "userInfo.email": 1,
      deliveryInfo: 1,
      finalPrice: 1,
      createdAt: 1,
      shippingFee: 1,
      expectedDeliveryDate: 1,
      userAddressId: 1,
    },
  });

  const order = await Order.aggregate(pipeline);

  if (!order) {
    logger.warn("Đơn hàng không tồn tại");
    return res.status(404).json({ error: "Not found" });
  }

  logger.info("Lấy đơn hàng thành công");
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
  ) {
    logger.warn(messages.MSG1);
    throw new Error(messages.MSG1);
  }

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
    paymentMethod,
    deliveryInfo,
    expectedDeliveryDate,
  });

  chatbotController.updateEntityOrderId(newOrder._id);
  logger.info(messages.MSG19);
  await newOrder.save();
  res.status(201).json({ message: messages.MSG19, data: newOrder });
});

const updateDeliveryInfoById = asyncHandler(async (req, res, next) => {
  const orderId = req.params.id;
  const { status, deliveryAddress, expectedDeliveryDate } = req.body;
  let order = await Order.findById(orderId);

  if (!order) {
    logger.warn("Đơn hàng không tồn tại");
    return res.status(404).json({ error: "Not found" });
  }

  const orderService = new OrderService(order);
  if (!status || !deliveryAddress) {
    logger.warn(messages.MSG1);
    throw new Error(messages.MSG1);
  }

  let state;

  switch (status) {
    case orderStatus.PENDING:
      state = new PendingState(orderService, orderService.getOrder(), {
        status,
        deliveryAddress,
        expectedDeliveryDate,
      });
      break;
    case orderStatus.ACCEPTED:
      state = new AcceptedState(orderService, orderService.getOrder(), {
        status,
        deliveryAddress,
        expectedDeliveryDate,
      });
      break;
    case orderStatus.PROCESSING:
      state = new ProcessingState(orderService, orderService.getOrder(), {
        status,
        deliveryAddress,
        expectedDeliveryDate,
      });
      break;
    case orderStatus.IN_DELIVERY:
      state = new InDeliveryState(orderService, orderService.getOrder(), {
        status,
        deliveryAddress,
        expectedDeliveryDate,
      });
      break;
    case orderStatus.SHIPPED:
      state = new ShippedState(orderService, orderService.getOrder(), {
        status,
        deliveryAddress,
        expectedDeliveryDate,
      });
      break;
    case orderStatus.CANCELLED_CUSTOMER:
      state = new CancelledCustomerState(
        orderService,
        orderService.getOrder(),
        {
          status,
          deliveryAddress,
          expectedDeliveryDate,
        }
      );
      break;
    case orderStatus.CANCELLED_EMPLOYEE:
      state = new CancelledEmployeeState(
        orderService,
        orderService.getOrder(),
        {
          status,
          deliveryAddress,
          expectedDeliveryDate,
        }
      );
      break;
  }

  orderService.changeState(state);
  await orderService.execute(req.redisClient);
  order = orderService.getOrder();

  logger.info(messages.MSG44);
  await order.save();
  res.status(200).json({ message: messages.MSG44, data: order });
});

const updatePaymentStatusById = asyncHandler(async (req, res, next) => {
  const orderId = req.params.id;
  const { paymentStatus } = req.body;
  const order = await Order.findById(orderId);

  if (!order) {
    logger.warn("Đơn hàng không tồn tại");
    return res.status(404).json({ error: "Not found" });
  }

  order.paymentStatus = paymentStatus;
  logger.info(messages.MSG40);
  await order.save();
  res.status(200).json({ message: messages.MSG40, data: order });
});

const checkoutWithMoMo = asyncHandler(async (req, res, next) => {
  paymentContext.setStrategy(moMoStrategy);
  const result = await paymentContext.checkout(
    req.body.orderId,
    req.body.amount
  );
  res.status(200).json(result);
});

const callbackMoMo = async (req, res, next) => {
  moMoStrategy.setOrderId(req.body.orderId);
  moMoStrategy.setResultCode(req.body.resultCode);
  paymentContext.setStrategy(moMoStrategy);
  await paymentContext.callback();
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

    if (!order) {
      logger.warn("Đơn hàng không tồn tại");
      return res.status(404).json();
    }

    order.paymentStatus = paymentStatus.PAID;
    logger.info("Thanh toán đơn hàng thành công!");
    order.save();
    return res.status(200).json();
  } else {
    logger.info("Thanh toán đơn hàng thất bại!");
    return res.status(200).json();
  }
});

const checkoutWithZaloPay = asyncHandler(async (req, res, next) => {
  paymentContext.setStrategy(zaloPayStrategy);
  const result = await paymentContext.checkout(
    req.body.orderId,
    req.body.amount
  );
  return res.status(200).json(result);
});

const callbackZaloPay = async (req, res, next) => {
  zaloPayStrategy.setData(req.body.data);
  zaloPayStrategy.setMac(req.body.mac);
  paymentContext.setStrategy(zaloPayStrategy);
  await paymentContext.callback();
};

const checkoutWithVnPay = asyncHandler(async (req, res, next) => {
  const ipAddr =
    req.headers["x-forwarded-for"] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress;
  vnPayStrategy.setIpAddr(ipAddr);
  paymentContext.setStrategy(vnPayStrategy);
  const result = await paymentContext.checkout(
    req.body.orderId,
    req.body.amount
  );
  res.status(200).json({ url: result });
});

const callbackVnPay = asyncHandler(async (req, res, next) => {
  vnPayStrategy.setQuery(req.query);
  paymentContext.setStrategy(vnPayStrategy);
  const url = await paymentContext.callback();
  return res.redirect(url);
});

const sendMailDeliveryInfo = asyncHandler(async (req, res, next) => {
  const { orderId, email } = req.body;
  const order = await Order.findById(orderId);

  if (!order) {
    logger.warn("Đơn hàng không tồn tại");
    throw new Error("Not found");
  }

  await sendDeliveryInfo(email, order);
  logger.info("Gửi email thông báo trạng thái đơn hàng thành công!");
  res.status(200).json({});
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
  sendMailDeliveryInfo: sendMailDeliveryInfo,
  checkoutWithZaloPay: checkoutWithZaloPay,
  checkoutWithVnPay: checkoutWithVnPay,
  callbackVnPay: callbackVnPay,
  callbackZaloPay: callbackZaloPay,
};
