// src/middleware/upload.js
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..', '..')

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
    const ext = path.extname(file.originalname)
    cb(null, unique + ext)
  },
})

export const upload = multer({ storage })

export default upload
