import path from "path";
import multer from "multer";
import fs from "fs-extra";


const uploadDir = path.resolve(process.cwd(), "uploads");
const videoDir = path.join(uploadDir, "videos");
const thumbDir = path.join(uploadDir, "thumbnails");
const avatarDir = path.join(uploadDir, "avatars");

fs.ensureDirSync(videoDir);
fs.ensureDirSync(thumbDir);
fs.ensureDirSync(avatarDir);

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    if (file.fieldname === "video") {
      cb(null, videoDir);
    } else if (file.fieldname === "thumbnail") {
      cb(null, thumbDir);
    } else if (file.fieldname === "avatar") {
      cb(null, avatarDir);
    } else {
      cb(new Error(`未知上传字段: ${file.fieldname}`), uploadDir);
    }
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  },
});

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (file.fieldname === "video") {
    const videoTypes = ["video/mp4", "video/mov", "video/avi", "video/webm"];
    if (videoTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error("只支持 MP4/MOV/AVI/WebM"));
  } else if (file.fieldname === "thumbnail" || file.fieldname === "avatar") {
    const imageTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (imageTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error("只支持 JPG/PNG/WebP"));
  } else {
    cb(new Error(`未知上传字段: ${file.fieldname}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 },
});

export default upload;
