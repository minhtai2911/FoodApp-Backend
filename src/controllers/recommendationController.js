import * as tf from "@tensorflow/tfjs-node";
import Product from "../models/product.js";
import ProductView from "../models/productView.js";
import { messages } from "../config/messageHelper.js";

const getUserProductData = async () => {
  try {
    const pipeline = [
      {
        $lookup: {
          from: "orders",
          localField: "orderId",
          foreignField: "_id",
          as: "orderInfo",
        },
      },
      {
        $lookup: {
          from: "productvariants",
          localField: "productVariantId",
          foreignField: "_id",
          as: "productVariantInfo",
        },
      },
      {
        $project: {
          userId: { $arrayElemAt: ["$orderInfo.userId", 0] },
          productId: { $arrayElemAt: ["$productVariantInfo.productId", 0] },
        },
      },
    ];

    // const productPurchase = await OrderDetail.aggregate(pipeline);
    const productView = await ProductView.find();
    // const dataRaw = [...productPurchase, ...productView];
    const dataRaw = [...productView];

    if (!dataRaw || dataRaw.length === 0) {
      throw new Error("No data found from database.");
    }

    return dataRaw
      .filter((item) => item.userId && item.productId)
      .map((item) => ({
        userId: item.userId.toString(),
        productId: item.productId.toString(),
      }));
  } catch (err) {
    throw new Error(err.message);
  }
};

const trainModel = async () => {
  try {
    const data = await getUserProductData();

    const userEncoder = {};
    const productEncoder = {};
    const productDecoder = {};

    data.forEach((item) => {
      if (item.userId && userEncoder[item.userId] == undefined) {
        userEncoder[item.userId] = Object.keys(userEncoder).length;
      }
      if (item.productId && productEncoder[item.productId] == undefined) {
        const index = Object.keys(productEncoder).length;
        productEncoder[item.productId] = index;
        productDecoder[index] = item.productId;
      }
    });

    if (
      Object.keys(userEncoder).length === 0 ||
      Object.keys(productEncoder).length === 0
    ) {
      throw new Error("Not enough data for training");
    }

    const X = data.map((item) => ({
      user: userEncoder[item.userId],
      product: productEncoder[item.productId],
    }));

    const y = new Array(X.length).fill(1);

    const embeddingSize = 50;

    const userInput = tf.input({ shape: [1], name: "user" });
    const productInput = tf.input({ shape: [1], name: "product" });

    const userEmbedding = tf.layers
      .embedding({
        inputDim: Object.keys(userEncoder).length,
        outputDim: embeddingSize,
      })
      .apply(userInput);

    const productEmbedding = tf.layers
      .embedding({
        inputDim: Object.keys(productEncoder).length,
        outputDim: embeddingSize,
      })
      .apply(productInput);

    const dotProduct = tf.layers
      .dot({ axes: 2 })
      .apply([userEmbedding, productEmbedding]);

    const output = tf.layers.flatten().apply(dotProduct);

    const model = tf.model({
      inputs: [userInput, productInput],
      outputs: output,
    });

    model.compile({
      optimizer: "adam",
      loss: "binaryCrossentropy",
    });

    const userInputData = X.map((item) => item.user);
    const productInputData = X.map((item) => item.product);

    const userInputTensor = tf.tensor2d(userInputData, [
      userInputData.length,
      1,
    ]);
    const productInputTensor = tf.tensor2d(productInputData, [
      productInputData.length,
      1,
    ]);
    const yTensor = tf.tensor2d(y, [y.length, 1]);

    await model.fit([userInputTensor, productInputTensor], yTensor, {
      epochs: 5,
      batchSize: 64,
    });

    return { model, userEncoder, productEncoder, productDecoder };
  } catch (err) {
    throw new Error(err.message);
  }
};

const recommend = async (req, res, next) => {
  try {
    const { model, userEncoder, productEncoder, productDecoder } =
      await trainModel();

    const userIdx = userEncoder[req.user.id];
    if (userIdx == undefined) {
      const bestSeller = await Product.find({
        soldQuantity: { $gt: 0 },
        isActive: true,
      })
        .sort({
          soldQuantity: -1,
        })
        .limit(6);

      const newArrival = await Product.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(4);

      const products = [...bestSeller, ...newArrival];

      const result = Array.from(
        new Map(products.map((item) => [item._id.toString(), item])).values()
      );

      return res.status(200).json({ data: result });
    }

    const productIndices = Object.values(productEncoder);
    const userInputArray = new Array(productIndices.length).fill(userIdx);
    const productInputArray = productIndices;

    const userInputTensor = tf.tensor2d(userInputArray, [
      userInputArray.length,
      1,
    ]);
    const productInputTensor = tf.tensor2d(productInputArray, [
      productInputArray.length,
      1,
    ]);

    const predictions = await model.predict([
      userInputTensor,
      productInputTensor,
    ]);

    const predictionsArray = Array.from(predictions.dataSync());

    const sortedIndices = predictionsArray
      .map((value, index) => ({ value, index }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map((item) => item.index);

    const topNProductIds = sortedIndices.map((i) => productDecoder[i]);

    let result = [];
    for (let productId of topNProductIds) {
      const product = await Product.findById(productId);
      result.push(product);
    }

    res.status(200).json({ data: result });
  } catch (err) {
    if (err.message === "No data found from database.")
      return res.status(200).json({ data: [] });
    res.status(500).json({
      error: err.message,
      message: messages.MSG5,
    });
  }
};

export default { recommend: recommend };
