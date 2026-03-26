import multer from "multer";
import multerS3 from "multer-s3";
import path from "path";
import { nanoid } from "nanoid";
import { b2Client } from "../config/b2.js";
import { env } from "../config/env.js";

const allowedMimeToExt = new Map([
  ["application/pdf", ".pdf"],
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"],
]);

export const upload = multer({
  storage: multerS3({
    s3: b2Client,
    bucket: env.b2BucketName,
    key: (req, file, cb) => {
      const safeExt = path.extname(file.originalname).toLowerCase();
      cb(null, `uploads/${Date.now()}-${nanoid(16)}${safeExt}`);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
  }),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    const expectedExt = allowedMimeToExt.get(file.mimetype);
    if (!expectedExt) return cb(new Error("File type not allowed"));

    const ext = path.extname(file.originalname).toLowerCase();
    const extMatches =
      ext === expectedExt ||
      (expectedExt === ".jpg" && ext === ".jpeg");

    if (!extMatches) return cb(new Error("File extension does not match file type"));
    cb(null, true);
  },
});
