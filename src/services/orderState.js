import { orderStatus } from "../config/orderStatus.js";
import ProductVariant from "../models/productVariant.js";
import Product from "../models/product.js";
import { addOrderToReport } from "../controllers/statisticController.js";

//State pattern
export class OrderService {
  constructor(order) {
    this.order = order;
    switch (order.deliveryInfo[order.deliveryInfo.length - 1].status) {
      case orderStatus.PENDING:
        this.state = new PendingState(this, this.order);
        break;
      case orderStatus.ACCEPTED:
        this.state = new AcceptedState(this, this.order);
        break;
      case orderStatus.PROCESSING:
        this.state = new ProcessingState(this, this.order);
        break;
      case orderStatus.IN_DELIVERY:
        this.state = new InDeliveryState(this, this.order);
        break;
      case orderStatus.SHIPPED:
        this.state = new ShippedState(this, this.order);
        break;
      case orderStatus.CANCELLED_CUSTOMER:
        this.state = new CancelledCustomerState(this, this.order);
        break;
      case orderStatus.CANCELLED_EMPLOYEE:
        this.state = new CancelledEmployeeState(this, this.order);
        break;
    }
  }

  setState(state) {
    this.state = state;
  }

  changeState(state) {
    this.state.changeState(state);
  }

  getOrder() {
    return this.state.getOrder();
  }

  async execute(redisClient) {
    this.state.execute(redisClient);
  }
}

export class PendingState {
  constructor(context, order, options = {}) {
    this.context = context;
    this.order = order;

    if (options.status && options.deliveryAddress) {
      this.order.deliveryInfo.push({
        status: options.status,
        deliveryAddress: options.deliveryAddress,
        deliveryDate: new Date(),
      });
    }

    if (options.expectedDeliveryDate) {
      this.order.expectedDeliveryDate = options.expectedDeliveryDate;
    }
  }

  changeState(state) {
    this.context.setState(state);
  }

  getOrder() {
    return this.order;
  }

  async execute(redisClient) {}
}

export class AcceptedState {
  constructor(context, order, options = {}) {
    this.context = context;
    this.order = order;

    if (options.status && options.deliveryAddress) {
      this.order.deliveryInfo.push({
        status: options.status,
        deliveryAddress: options.deliveryAddress,
        deliveryDate: new Date(),
      });
    }

    if (options.expectedDeliveryDate) {
      this.order.expectedDeliveryDate = options.expectedDeliveryDate;
    }
  }

  changeState(state) {
    this.context.setState(state);
  }

  getOrder() {
    return this.order;
  }

  async execute(redisClient) {
    try {
      for (let orderItem of this.order.orderItems) {
        const cacheKey = `productVariant:${orderItem.productVariantId}`;
        const productVariant = await ProductVariant.findById(
          orderItem.productVariantId
        );
        productVariant.stock -= orderItem.quantity;
        await redisClient.hincrby(cacheKey, "stock", -orderItem.quantity);
        await productVariant.save();
      }
    } catch (err) {
      throw new Error(err.message);
    }
  }
}

export class ProcessingState {
  constructor(context, order, options = {}) {
    this.context = context;
    this.order = order;

    if (options.status && options.deliveryAddress) {
      this.order.deliveryInfo.push({
        status: options.status,
        deliveryAddress: options.deliveryAddress,
        deliveryDate: new Date(),
      });
    }

    if (options.expectedDeliveryDate) {
      this.order.expectedDeliveryDate = options.expectedDeliveryDate;
    }
  }

  changeState(state) {
    this.context.setState(state);
  }

  getOrder() {
    return this.order;
  }

  async execute(redisClient) {}
}

export class InDeliveryState {
  constructor(context, order, options = {}) {
    this.context = context;
    this.order = order;

    if (options.status && options.deliveryAddress) {
      this.order.deliveryInfo.push({
        status: options.status,
        deliveryAddress: options.deliveryAddress,
        deliveryDate: new Date(),
      });
    }

    if (options.expectedDeliveryDate) {
      this.order.expectedDeliveryDate = options.expectedDeliveryDate;
    }
  }

  changeState(state) {
    this.context.setState(state);
  }

  getOrder() {
    return this.order;
  }

  async execute(redisClient) {}
}

export class ShippedState {
  constructor(context, order, options = {}) {
    this.context = context;
    this.order = order;

    if (options.status && options.deliveryAddress) {
      this.order.deliveryInfo.push({
        status: options.status,
        deliveryAddress: options.deliveryAddress,
        deliveryDate: new Date(),
      });
    }

    if (options.expectedDeliveryDate) {
      this.order.expectedDeliveryDate = options.expectedDeliveryDate;
    }
  }

  changeState(state) {
    this.context.setState(state);
  }

  getOrder() {
    return this.order;
  }

  async execute(redisClient) {
    try {
      for (let orderItem of this.order.orderItems) {
        const cacheKey = `product:${orderItem.productId}`;
        const product = await Product.findById(orderItem.productId);
        product.soldQuantity += orderItem.quantity;
        await redisClient.hincrby(cacheKey, "soldQuantity", orderItem.quantity);
        await product.save();
      }
      addOrderToReport(this.order.finalPrice);
    } catch (err) {
      throw new Error(err.message);
    }
  }
}

export class CancelledCustomerState {
  constructor(context, order, options = {}) {
    this.context = context;
    this.order = order;

    if (options.status && options.deliveryAddress) {
      this.order.deliveryInfo.push({
        status: options.status,
        deliveryAddress: options.deliveryAddress,
        deliveryDate: new Date(),
      });
    }

    if (options.expectedDeliveryDate) {
      this.order.expectedDeliveryDate = options.expectedDeliveryDate;
    }
  }

  changeState(state) {
    this.context.setState(state);
  }

  getOrder() {
    return this.order;
  }

  async execute(redisClient) {}
}

export class CancelledEmployeeState {
  constructor(context, order, options = {}) {
    this.context = context;
    this.order = order;

    if (options.status && options.deliveryAddress) {
      this.order.deliveryInfo.push({
        status: options.status,
        deliveryAddress: options.deliveryAddress,
        deliveryDate: new Date(),
      });
    }

    if (options.expectedDeliveryDate) {
      this.order.expectedDeliveryDate = options.expectedDeliveryDate;
    }
  }

  changeState(state) {
    this.context.setState(state);
  }

  getOrder() {
    return this.order;
  }

  async execute(redisClient) {}
}
