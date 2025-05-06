import { orderStatus } from "../config/orderStatus.js";

class OrderService {
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

  nextState(deliveryAddress) {
    this.state.next(deliveryAddress);
  }
}

class PendingState {
  constructor(context, order) {
    this.context = context;
    this.order = order;
  }

  next(deliveryAddress) {
    this.order.deliveryInfo.push({
      status: orderStatus.ACCEPTED,
      deliveryAddress: deliveryAddress,
    });
    this.context.setState(new AcceptedState(this.context, this.order));
  }
}

class AcceptedState {
  constructor(context, order) {
    this.context = context;
    this.order = order;
  }

  next(deliveryAddress) {
    this.order.deliveryInfo.push({
      status: orderStatus.PROCESSING,
      deliveryAddress: deliveryAddress,
    });
    this.context.setState(new ProcessingState(this.context, this.order));
  }
}

class ProcessingState {
  constructor(context, order) {
    this.context = context;
    this.order = order;
  }

  next(deliveryAddress) {
    this.order.deliveryInfo.push({
      status: orderStatus.IN_DELIVERY,
      deliveryAddress: deliveryAddress,
    });
    this.context.setState(new InDeliveryState(this.context, this.order));
  }
}

class InDeliveryState {
  constructor(context, order) {
    this.context = context;
    this.order = order;
  }

  next(deliveryAddress) {
    this.order.deliveryInfo.push({
      status: orderStatus.SHIPPED,
      deliveryAddress: deliveryAddress,
    });
    this.context.setState(new ShippedState(this.context, this.order));
  }
}

class ShippedState {
  constructor(context, order) {
    this.context = context;
    this.order = order;
  }

  next(deliveryAddress) {
    throw new Error("Đơn hàng đã hoàn thành. Không có trạng thái tiếp theo");
  }
}

class CancelledCustomerState {
  constructor(context, order) {
    this.context = context;
    this.order = order;
  }

  next(deliveryAddress) {
    throw new Error("Đơn hàng đã hủy. Không có trạng thái tiếp theo");
  }
}

class CancelledEmployeeState {
  constructor(context, order) {
    this.context = context;
    this.order = order;
  }

  next(deliveryAddress) {
    throw new Error("Đơn hàng đã hủy. Không có trạng thái tiếp theo");
  }
}
