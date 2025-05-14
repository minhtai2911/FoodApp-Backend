import mongoose from "mongoose";
import logger from "../utils/logger.js";
import dotenv from "dotenv";
import * as Sentry from "@sentry/node";

dotenv.config();
const DB_URL = process.env.DB_URL;

// Singleton Pattern
class DBConnection {
  constructor() {
    if (DBConnection.instance) return DBConnection.instance;
    this.connected = false;
    DBConnection.instance = this;
  }

  connect() {
    if (!this.connected) {
      mongoose
        .connect(DB_URL)
        .then(() => {
          logger.info("Database connected successful!");
          this.connected = true;
        })
        .catch((err) => {
          logger.error("Database connection error", err);
          Sentry.captureException(err);
        });
    }
  }
}

const db = new DBConnection();

export default db;
