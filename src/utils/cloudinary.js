import { v2 as cloudinary } from "cloudinary";
import logger from "./logger.js";
import dotenv from "dotenv";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadImageToCloudinary = async (url) => {
  try {
    const uploadResult = await cloudinary.uploader.upload(url);
    return uploadResult;
  } catch (err) {
    throw new Error(err.message);
  }
};

const deleteImageFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (err) {
    throw new Error(err.message);
  }
};

const getImageFromCloudinary = (url, height, width) => {
  try {
    const result = cloudinary.url(url, {
      transformation: [
        {
          fetch_format: "auto",
          quality: "auto",
        },
        {
          width: width,
          height: height,
        },
      ],
    });

    return result;
  } catch (err) {
    throw new Error(err.message);
  }
};

export default {
  getImageFromCloudinary: getImageFromCloudinary,
  uploadImageToCloudinary: uploadImageToCloudinary,
  deleteImageFromCloudinary: deleteImageFromCloudinary,
};
