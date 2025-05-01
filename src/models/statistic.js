import mongoose from "mongoose";

const statisticSchema = new mongoose.Schema({
  day: {
    type: Number,
    required: true,
    min: 1,
    max: 31,
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
  },
  year: {
    type: Number,
    required: true,
  },
  totalOrder: {
    type: Number,
    required: true,
    default: 0,
  },
  totalRevenue: {
    type: Number,
    required: true,
    default: 0,
  }
});

export default mongoose.model("Statistic", statisticSchema);
