import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePaths) => {
  try {
    if (!localFilePaths || localFilePaths.length === 0) {
      return null;
    }

    const uploadPromises = localFilePaths.map(async (localFilePath) => {
      if (!localFilePath) return null;
      const response = await cloudinary.uploader.upload(localFilePath, {
        resource_type: "auto",
      });
      console.log("File has been uploaded successfully " + response.url);
      return response;
    });

    const uploadedFiles = await Promise.all(uploadPromises);
    return uploadedFiles;
  } catch (error) {
    fs.unlinkSync(localFilePaths); // <-- This line is problematic
    return null;
  }
};

export { uploadOnCloudinary };
