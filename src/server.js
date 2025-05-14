import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import passport from "passport";
import helmet from "helmet";
import Redis from "ioredis";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import logger from "./utils/logger.js";
import * as Sentry from "@sentry/node";

import authRoute from "./routes/authRoute.js";
import userRoute from "./routes/userRoute.js";
import productRoute from "./routes/productRoute.js";
import reviewRoute from "./routes/reviewRoute.js";
import userRoleRoute from "./routes/userRoleRoute.js";
import orderRoute from "./routes/orderRoute.js";
import shoppingCartRoute from "./routes/shoppingCartRoute.js";
import categoryRoute from "./routes/categoryRoute.js";
import productVariantRoute from "./routes/productVariantRoute.js";
import chatbotRoute from "./routes/chatbotRoute.js";
import statisticRoute from "./routes/statisticRoute.js";
import recommendationRoute from "./routes/recommendationRoute.js";
import productViewRoute from "./routes/productViewRoute.js";
import userAddressRoute from "./routes/userAddressRoute.js";
import db from "./config/database.js";
import "./config/sentry.js";

const app = express();
dotenv.config();
const PORT = process.env.PORT || 8000;
const redisClient = new Redis(process.env.REDIS_URL);

app.use(express.json());
app.use(bodyParser.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(helmet());
app.use(passport.initialize());

db.connect();

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  next();
});

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "middleware",
  points: 10,
  duration: 1,
});

app.use((req, res, next) => {
  rateLimiter
    .consume(req.ip)
    .then(() => next())
    .catch(() => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({ success: false, message: "Too many requests" });
    });
});

const sensitiveEndpointsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ success: false, message: "Too many requests" });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

app.use("/api/v1/auth/signup", sensitiveEndpointsLimiter);
app.use(
  "/api/v1/auth",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  authRoute
);
app.use("/api/v1/user", userRoute);
app.use(
  "/api/v1/product",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  productRoute
);
app.use(
  "/api/v1/review",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  reviewRoute
);
app.use("/api/v1/userRole", userRoleRoute);
app.use(
  "/api/v1/order",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  orderRoute
);
app.use("/api/v1/shoppingCart", shoppingCartRoute);
app.use(
  "/api/v1/category",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  categoryRoute
);
app.use(
  "/api/v1/productVariant",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  productVariantRoute
);
app.use("/api/v1/chatbot", chatbotRoute);
app.use("/api/v1/statistic", statisticRoute);
app.use("/api/v1/recommendation", recommendationRoute);
app.use("/api/v1/productView", productViewRoute);
app.use("/api/v1/userAddress", userAddressRoute);

Sentry.setupExpressErrorHandler(app);

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at", promise, "reason:", reason);
  Sentry.captureException(reason);
});
