import { diskStorage } from "multer";
import { extname } from "path";
import { BadRequestException } from "@nestjs/common";

export const multerVideoConfig = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      cb(null, "./uploads/videos");
    },

    filename: (req, file, cb) => {
      const uniqueName =
        Date.now() +
        "-" +
        Math.round(Math.random() * 1e9) +
        extname(file.originalname);

      cb(null, uniqueName);
    },
  }),

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "video/mp4",
      "video/mpeg",
      "video/quicktime", // mov
      "video/x-msvideo", // avi
      "video/webm",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new BadRequestException("Faqat video fayl yuklash mumkin") as any,
        false
      );
    }

    cb(null, true);
  },

  limits: {
    fileSize: 1024 * 1024 * 200, // 200MB
  },
};