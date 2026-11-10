// src/middlewares/upload.middleware.ts
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Asegúrate de tener una carpeta "uploads" o se creará temporalmente
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'cobas-' + uniqueSuffix + path.extname(file.originalname));
  }
});

export const upload = multer({ storage });