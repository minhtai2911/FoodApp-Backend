import dialogflow from "@google-cloud/dialogflow";
import { v4 as uuidv4 } from "uuid";
import Product from "../models/product.js";
import Category from "../models/category.js";
import Order from "../models/order.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import logger from "../utils/logger.js";

const CREDENTIALS = JSON.parse(process.env.CREDENTIALS);
const PROJECTID = CREDENTIALS.project_id;

const CONFIGURATION = {
  credentials: {
    private_key: CREDENTIALS["private_key"],
    client_email: CREDENTIALS["client_email"],
  },
};

const sessionClient = new dialogflow.SessionsClient(CONFIGURATION);

const chatbot = asyncHandler(async (req, res, next) => {
  const message = req.body.message;
  const sessionId = uuidv4();

  let sessionPath = sessionClient.projectAgentSessionPath(PROJECTID, sessionId);

  let request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: message,
        languageCode: "vi",
      },
    },
  };
  const responses = await sessionClient.detectIntent(request);
  const result = responses[0].queryResult;

  if (result.fulfillmentText === "Best Seller") {
    const product = await Product.find({ soldQuantity: { $gt: 0 } })
      .sort({
        soldQuantity: -1,
      })
      .limit(10);

    logger.info("Chatbot xử lí phản hồi thành công!");
    return res.status(200).json({
      message:
        "Cảm ơn bạn đã ghé thăm FoodyRush. Dưới đây là một số sản phẩm bán chạy nhất của chúng mình hiện nay:",
      data: product,
      type: "Product",
      messageEnd:
        "Nếu bạn cần thêm thông tin chi tiết về từng sản phẩm hoặc muốn biết thêm về các sản phẩm khác, hãy cho mình biết nhé! FoodyRush luôn sẵn sàng hỗ trợ bạn!",
    });
  }

  if (result.fulfillmentText === "New Arrival") {
    const product = await Product.find({}).sort({ createdAt: -1 }).limit(10);

    logger.info("Chatbot xử lí phản hồi thành công!");
    return res.status(200).json({
      message:
        "Cảm ơn bạn đã quan tâm đến các sản phẩm mới tại FoodyRush. Dưới đây là một số sản phẩm mới nhất mà chúng mình vừa ra mắt:",
      data: product,
      type: "Product",
      messageEnd:
        "Nếu bạn cần thêm thông tin chi tiết về từng sản phẩm hoặc muốn biết thêm về các sản phẩm khác, hãy cho mình biết nhé! FoodyRush luôn sẵn sàng hỗ trợ bạn!",
    });
  }

  if (result.fulfillmentText.substring(0, 8) === "Category") {
    const categoryName = result.fulfillmentText.substring(
      10,
      result.fulfillmentText.indexOf(";")
    );

    const categories = await Category.find({ name: categoryName });

    if (categories.length == 0) {
      logger.info("Chatbot xử lí phản hồi thành công!");
      return res.status(200).json({
        message:
          "Cảm ơn bạn đã quan tâm đến sản phẩm của chúng mình. Hiện tại, sản phẩm mà bạn đang tìm kiếm đã bán hết. Chúng mình rất tiếc vì sự bất tiện này.",
        data: null,
        messageEnd: null,
      });
    }

    let products = [];

    for (let category of categories) {
      const product = await Product.find({ categoryId: category._id })
        .sort({
          soldQuantity: -1,
        })
        .limit(10);
      products.push(...product);
    }

    logger.info("Chatbot xử lí phản hồi thành công!");
    return res.status(200).json({
      message: `Dưới đây là một số sản phẩm ${categoryName} đang có sẵn tại FoodyRush, phù hợp với tiêu chí của bạn:`,
      data: products,
      type: "Product",
      messageEnd:
        "Nếu bạn cần thêm thông tin chi tiết về từng sản phẩm hoặc muốn biết thêm về các sản phẩm khác, hãy cho mình biết nhé! FoodyRush luôn sẵn sàng hỗ trợ bạn!",
    });
  }

  if (result.fulfillmentText.substring(0, 7) === "OrderId") {
    const orderId = result.fulfillmentText.substring(10);
    const orderTracking = await Order.findById(orderId, {
      deliveryInfo: 1,
      orderItems: 1,
    });

    if (!orderTracking)
      return res
        .status(404)
        .json({ error: "Lịch sử giao hàng không tồn tại." });

    return res.status(200).json({
      data: orderTracking,
      type: "OrderTracking",
    });
  }

  return res
    .status(200)
    .json({ message: result.fulfillmentText, data: null, messageEnd: null });
});

const entityCategoryId =
  "projects/fastfood-egpp/agent/entityTypes/70907846-7225-4e48-abb3-8bbfb4d8d7dd";
const entityTypesClient = new dialogflow.EntityTypesClient(CONFIGURATION);

const updateEntityCategory = async (category, synonyms) => {
  try {
    const [entityType] = await entityTypesClient.getEntityType({
      name: entityCategoryId,
    });

    const newEntityValue = category;

    const existingValues = entityType.entities.map((entity) => entity.value);
    if (existingValues.includes(newEntityValue)) {
      return;
    }

    entityType.entities.push({
      value: newEntityValue,
      synonyms: synonyms,
    });

    const updateEntityRequest = {
      entityType: entityType,
    };

    await entityTypesClient.updateEntityType(updateEntityRequest);
  } catch (err) {
    throw new Error(err.message);
  }
};

const deleteEntityCategory = async (category) => {
  try {
    const [entityType] = await entityTypesClient.getEntityType({
      name: entityCategoryId,
    });

    const existingValues = entityType.entities.map((entity) => entity.value);

    if (existingValues.includes(category)) {
      const entityIndex = entityType.entities.findIndex(
        (entity) => entity.value === category
      );

      entityType.entities.splice(entityIndex, 1);
    }

    const updateEntityRequest = {
      entityType: entityType,
    };

    await entityTypesClient.updateEntityType(updateEntityRequest);
  } catch (err) {
    throw new Error(err.message);
  }
};

const entityOrderIdId =
  "projects/fastfood-egpp/agent/entityTypes/2b4a5a53-93ea-4dee-a7fc-478ec440f19a";

const updateEntityOrderId = async (orderId) => {
  try {
    const [entityType] = await entityTypesClient.getEntityType({
      name: entityOrderIdId,
    });

    const newEntityValue = orderId;

    const existingValues = entityType.entities.map((entity) => entity.value);
    if (existingValues.includes(newEntityValue)) {
      return;
    }

    entityType.entities.push({
      value: newEntityValue,
      synonyms: [orderId],
    });

    const updateEntityRequest = {
      entityType: entityType,
    };

    await entityTypesClient.updateEntityType(updateEntityRequest);
  } catch (err) {
    throw new Error(err.message);
  }
};

const deleteEntityOrderId = async (orderId) => {
  try {
    const [entityType] = await entityTypesClient.getEntityType({
      name: entityOrderIdId,
    });

    const existingValues = entityType.entities.map((entity) => entity.value);

    if (existingValues.includes(orderId)) {
      const entityIndex = entityType.entities.findIndex(
        (entity) => entity.value === orderId
      );

      entityType.entities.splice(entityIndex, 1);
    }

    const updateEntityRequest = {
      entityType: entityType,
    };

    await entityTypesClient.updateEntityType(updateEntityRequest);
  } catch (err) {
    throw new Error(err.message);
  }
};

export default {
  chatbot: chatbot,
  updateEntityCategory: updateEntityCategory,
  deleteEntityCategory: deleteEntityCategory,
  updateEntityOrderId: updateEntityOrderId,
  deleteEntityOrderId: deleteEntityOrderId,
};
