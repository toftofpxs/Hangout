import { v2 as cloudinary } from 'cloudinary';

const DEFAULT_CLOUDINARY_FOLDER = 'hangout/events';

let cloudinaryConfigured = false;

function isCloudinaryEnabled() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME
      && process.env.CLOUDINARY_API_KEY
      && process.env.CLOUDINARY_API_SECRET
  );
}

function ensureCloudinaryConfig() {
  if (cloudinaryConfigured) return;

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  cloudinaryConfigured = true;
}

function toLocalEventPhotoUrl(file) {
  if (!file) return null;
  if (file.filename) return `/uploads/events/${file.filename}`;

  const fromPath = file.path || file.originalname;
  if (!fromPath) return null;
  const filename = String(fromPath).replace(/\\+/g, '/').split('/').pop();
  return filename ? `/uploads/events/${filename}` : null;
}

export async function resolveEventPhotoUrls(files = []) {
  if (!Array.isArray(files) || files.length === 0) return [];

  if (!isCloudinaryEnabled()) {
    return files.map(toLocalEventPhotoUrl).filter(Boolean);
  }

  ensureCloudinaryConfig();

  const folder = process.env.CLOUDINARY_EVENTS_FOLDER || DEFAULT_CLOUDINARY_FOLDER;
  const resolved = [];

  for (const file of files) {
    const localUrl = toLocalEventPhotoUrl(file);

    if (!file?.path) {
      if (localUrl) resolved.push(localUrl);
      continue;
    }

    try {
      const uploaded = await cloudinary.uploader.upload(file.path, {
        folder,
        resource_type: 'image',
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      });

      if (uploaded?.secure_url) {
        resolved.push(uploaded.secure_url);
      } else if (localUrl) {
        resolved.push(localUrl);
      }
    } catch (error) {
      console.error('Cloudinary upload failed:', error?.message || error);
      if (localUrl) resolved.push(localUrl);
    }
  }

  return resolved;
}

export function cloudinaryStatus() {
  return {
    enabled: isCloudinaryEnabled(),
    folder: process.env.CLOUDINARY_EVENTS_FOLDER || DEFAULT_CLOUDINARY_FOLDER,
  };
}
