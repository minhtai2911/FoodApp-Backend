import { orderStatus } from "./orderStatus.js";
import Product from "../models/product.js";
import ProductVariant from "../models/productVariant.js";

const statusVal = [
  {
    icon: `
      <img
        src="https://res.cloudinary.com/dffy6tds8/image/upload/v1744184763/pending_rrh2aq.png"
        width="24" height="24"
        style="display: inline-block; vertical-align: middle;"
        alt="PENDING"
      />
    `,
    status: orderStatus.PENDING,
  },
  {
    icon: `
      <img
        src="https://res.cloudinary.com/dffy6tds8/image/upload/v1744184763/accepted_fm558i.png"
        width="24" height="24"
        style="display: inline-block; vertical-align: middle;"
        alt="ACCEPTED"
      />
    `,
    status: orderStatus.ACCEPTED,
  },
  {
    icon: `
      <img
        src="https://res.cloudinary.com/dffy6tds8/image/upload/v1744184762/processing_bweba3.png"
        width="24" height="24"
        style="display: inline-block; vertical-align: middle;"
        alt="PROCESSING"
      />
    `,
    status: orderStatus.PROCESSING,
  },
  {
    icon: `
      <img
        src="https://res.cloudinary.com/dffy6tds8/image/upload/v1744184762/in_delivery_khxoy7.png"
        width="24" height="24"
        style="display: inline-block; vertical-align: middle;"
        alt="IN_DELIVERY"
      />
    `,
    status: orderStatus.IN_DELIVERY,
  },
  {
    icon: `
      <img
        src="https://res.cloudinary.com/dffy6tds8/image/upload/v1744184762/shipped_gigyvw.png"
        width="24" height="24"
        style="display: inline-block; vertical-align: middle;"
        alt="SHIPPED"
      />
    `,
    status: orderStatus.SHIPPED,
  },
  {
    icon: `
      <img
        src="https://res.cloudinary.com/dffy6tds8/image/upload/v1744184762/cancelled_uusa0h.png"
        width="24" height="24"
        style="display: inline-block; vertical-align: middle;"
        alt="CANCELLED_EMPLOYEE"
      />
    `,
    status: orderStatus.CANCELLED_EMPLOYEE,
  },
  {
    icon: `
      <img
        src="https://res.cloudinary.com/dffy6tds8/image/upload/v1744184762/cancelled_uusa0h.png"
        width="24" height="24"
        style="display: inline-block; vertical-align: middle;"
        alt="CANCELLED_YOU"
      />
    `,
    status: orderStatus.CANCELLED_YOU,
  },
];

const deliveryInfoComponent = async (order) => {
  const deliveryInfoHTML = order.deliveryInfo
    .map((item) => {
      const icon = statusVal.find(
        (statusItem) => statusItem.status === item.status
      )?.icon;

      const optionsDate = {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      };
      const optionsTime = {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      };

      const date = new Date(item.deliveryDate).toLocaleDateString(
        "vi-VN",
        optionsDate
      );
      const time = new Date(item.deliveryDate).toLocaleTimeString(
        "vi-VN",
        optionsTime
      );

      const address = item.deliveryAddress;

      return `
        <div
          key={item._id}
          style="min-width: 15rem; margin-bottom: 1rem; text-align: center; display: inline-block; vertical-align: top;"
        >
          ${icon}
          <p style="font-size: 0.875rem; margin-top: 0.25rem;">
            ${item.status}
          </p>
          <div style="margin-top: 0.75rem; text-align: center;">
            <img
              src="https://res.cloudinary.com/dffy6tds8/image/upload/v1744184762/checked_a4i2j1.png"
              width="24" height="24"
              style="display: inline-block; vertical-align: middle;"
              alt="CHECKED"
            />
          </div>
          <p style="font-size: 0.875rem; margin-top: 0.75rem;">${date}</p>
          <p style="font-size: 0.875rem; margin-top: 0.25rem;">${time}</p>
          <p style="font-size: 0.875rem; margin-top: 0.25rem;">
            ${address}
          </p>
        </div>
      `;
    })
    .join("");

  const itemHTMLArray = await Promise.all(
    order.orderItems.map(async (item) => {
      const product = await Product.findById(item.productId);
      const productVariant = await ProductVariant.findById(
        item.productVariantId
      );

      return `
        <div
          key=${item._id}
          style="width: 100%; margin-bottom: 1rem;"
        >
          <div style="padding-top: 0.75rem; padding-bottom: 0.75rem; display: inline-block; width: 100%;">
            <hr />
            <div style="display: inline-block; width: 4rem; height: 4rem; margin-right: 1rem; vertical-align: top;">
              <img
                src=${product.images[0].url}
                alt=${product.name}
                style="width: 100%; height: 100%; object-fit: cover;"
              />
            </div>
            <div style="display: inline-block; vertical-align: top; width: calc(100% - 5rem);">
              <p style="font-weight: 500;">${product.name}</p>
              <p style="font-weight: 300;">
                Màu sắc: ${productVariant.color} | Kích cỡ: ${productVariant.size} | Số lượng: ${item.quantity}
              </p>
            </div>
          </div>
        </div>
      `;
    })
  );

  const orderItemsHTML = itemHTMLArray.join("");

  return `
      <div style="width: 100%; padding: 0 1rem;">
        <div style="margin-top: 2.5rem;">
          <p style="font-size: 1.5rem; font-weight: 500;">Trạng thái đơn hàng</p>
          <p style="margin-top: 0.25rem;">Mã đơn hàng: ${order._id}</p>
          <div style="border: 1px solid #ddd; border-radius: 8px; padding: 1.25rem 2.5rem; margin-top: 1.5rem; white-space: nowrap; overflow-x: auto; text-align: center">
            ${deliveryInfoHTML}
          </div>
          <div style="border: 1px solid #ddd; border-radius: 8px; padding: 1.25rem 2.5rem; margin-top: 1.5rem;">
            <p style="margin-bottom: 0.75rem;">Sản phẩm</p>
            <div style="margin-top: 1.5rem;">
              ${orderItemsHTML}
            </div>
          </div>
        </div>
      </div>
    `;
};

export default deliveryInfoComponent;
