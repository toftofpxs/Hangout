// src/middleware/upload.js
import multer from 'multer'
import path from 'path'
import fs from 'fs'

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsPath = path.resolve(process.cwd(), 'uploads', 'events');
    try {
      fs.mkdirSync(uploadsPath, { recursive: true });
    } catch (err) {
      // ignore
    }
    cb(null, uploadsPath)
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, unique + ext)
  },
})

export const upload = multer({ storage })

export default upload
