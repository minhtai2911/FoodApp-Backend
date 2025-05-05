import mongoose from "mongoose";
import logger from "../utils/logger.js";
import dotenv from "dotenv";

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
        })
        .catch((err) => {
          logger.error("Database connection error", err);
        });
      this.connected = true;
    }
  }
}

const db = new DBConnection();

export default db;
