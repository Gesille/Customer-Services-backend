import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export type CloudinaryUploadResult = {
  public_id: string;
  secure_url: string;
  resource_type: string;
  bytes: number;
  format?: string;
};

/**
 * Uploads a base64 data URI (what the frontend sends after FileReader.readAsDataURL)
 * or a remote URL. Used for course hero images and comment attachments.
 */
export const uploadToCloudinary = (
  fileDataUri: string,
  folder: "course-hero-images" | "comment-attachments",
  resourceType: "image" | "video" | "auto" = "auto",
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      fileDataUri,
      {
        folder: `next-learn/${folder}`,
        resource_type: resourceType,
        // keep uploads reasonable — hero images/attachments, not raw video masters
        transformation: resourceType === "image" ? [{ width: 1600, crop: "limit" }] : undefined,
      },
      (error, result) => {
        if (error || !result) return reject(error || new Error("Cloudinary upload failed"));
        resolve({
          public_id: result.public_id,
          secure_url: result.secure_url,
          resource_type: result.resource_type,
          bytes: result.bytes,
          format: result.format,
        });
      },
    );
  });
};

export const deleteFromCloudinary = async (
  publicId: string,
  resourceType: "image" | "video" = "image",
) => {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

export default cloudinary;
