import multer from "multer";

// Memory storage — we stream straight to Cloudinary, never touch disk.
const storage = multer.memoryStorage();

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp", "video/mp4", "video/webm", "video/quicktime"];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error(`Unsupported file type: ${file.mimetype}`));
  }
  cb(null, true);
};

export const uploadSingleImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_IMAGE_BYTES },
}).single("image");

// For comment attachments, which may be an image OR a short video
export const uploadSingleAttachment = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_VIDEO_BYTES },
}).single("attachment");

/** Turn a multer in-memory file into the data URI Cloudinary's SDK expects. */
export const bufferToDataUri = (file: Express.Multer.File) =>
  `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
