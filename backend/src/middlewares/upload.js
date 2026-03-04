import multer from "multer";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";

const uploadDir = path.resolve("uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeExt = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${nanoid(16)}${safeExt}`;
    cb(null, name);
  },
});

const allowedMimeToExt = new Map([
  ["application/pdf", ".pdf"],
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"],
]);

export const upload = multer({
  storage,
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