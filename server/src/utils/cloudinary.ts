import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";
import fs from "fs";
import path from "path";
import { logger } from "./logger.js";

const isCloudinaryConfigured = !!(
  env.CLOUDINARY_CLOUD_NAME &&
  env.CLOUDINARY_API_KEY &&
  env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
  logger.info("Cloudinary configured successfully.");
} else {
  logger.warn("Cloudinary credentials missing. Falling back to local file storage for uploads.");
}

export const uploadToCloud = async (localFilePath: string, folderName: string = "loan_docs"): Promise<string> => {
  if (isCloudinaryConfigured) {
    try {
      const response = await cloudinary.uploader.upload(localFilePath, {
        folder: folderName,
      });
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
      return response.secure_url;
    } catch (error) {
      logger.error("Cloudinary upload failed, using local fallback URL. Error: %o", error);
    }
  }

  const uploadsDir = path.resolve("./uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filename = `${Date.now()}_${path.basename(localFilePath)}`;
  const destinationPath = path.join(uploadsDir, filename);
  fs.copyFileSync(localFilePath, destinationPath);

  if (fs.existsSync(localFilePath)) {
    fs.unlinkSync(localFilePath);
  }

  return `/uploads/${filename}`;
};
