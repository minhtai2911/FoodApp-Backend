import { messages } from "../config/messageHelper.js";
import logger from "../utils/logger.js";

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    logger.error(messages.MSG5, err);
    return res.status(500).json({
      error: err.message,
      message: messages.MSG5,
    });
  });
};

export default asyncHandler;
