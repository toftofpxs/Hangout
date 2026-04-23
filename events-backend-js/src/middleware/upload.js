// src/middleware/upload.js
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..', '..')
const MAX_FILE_SIZE = Number(process.env.MAX_EVENT_IMAGE_SIZE_BYTES || 5 * 1024 * 1024)
const ALLOWED_MIME_TYPES = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
])

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsPath = path.join(projectRoot, 'uploads', 'events');
    try {
      fs.mkdirSync(uploadsPath, { recursive: true });
    } catch (err) {
      // ignore
    }
    cb(null, uploadsPath)
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const ext = ALLOWED_MIME_TYPES.get(file.mimetype) || path.extname(file.originalname).toLowerCase()
    cb(null, unique + ext)
  },
})

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'photos'))
    return
  }

  cb(null, true)
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    files: 5,
    fileSize: MAX_FILE_SIZE,
  },
})

export default upload
