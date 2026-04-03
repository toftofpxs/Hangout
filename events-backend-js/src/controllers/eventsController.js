// src/controllers/eventsController.js
import { EventModel } from "../models/eventModel.js";
import { resolveEventPhotoUrls } from "../services/mediaStorage.js";

/* -------------------- Lister tous les événements publics -------------------- */
export const listEvents = async (req, res, next) => {
  try {
    const events = await EventModel.findAll();
    res.json(events);
  } catch (err) {
    next(err);
  }
};

/* -------------------- Récupérer un événement par ID -------------------- */
export const getEvent = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const event = await EventModel.findById(id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  } catch (err) {
    next(err);
  }
};

/* -------------------- Créer un événement (avec photos) -------------------- */
export const createEvent = async (req, res, next) => {
  try {
    const { title, description, location, date, end_date, price } = req.body;
    const organizer_id = Number(req.user.id);

    // Validation de la date
    const eventDate = date instanceof Date ? date : new Date(date);
    if (isNaN(eventDate)) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    const eventEndDate = end_date
      ? (end_date instanceof Date ? end_date : new Date(end_date))
      : eventDate;

    if (isNaN(eventEndDate)) {
      return res.status(400).json({ message: "Invalid end_date format" });
    }

    if (eventEndDate < eventDate) {
      return res.status(400).json({ message: "end_date must be after date" });
    }

    // Récupérer les photos :
    // - priorité aux fichiers uploadés (req.files)
    // - sinon on prend éventuellement req.body.photos (JSON ou string)
    let photos = [];

    // 1) Fichiers uploadés via multer: upload.array('photos', 5)
    if (Array.isArray(req.files) && req.files.length > 0) {
      photos = await resolveEventPhotoUrls(req.files);
    }

    // 2) Valeur envoyée en JSON (optionnel, ex: URLs existantes)
    if (!photos.length && req.body.photos) {
      if (Array.isArray(req.body.photos)) {
        photos = req.body.photos;
      } else if (typeof req.body.photos === "string") {
        // si le front envoie une string JSON : '["/uploads/a.jpg","/uploads/b.jpg"]'
        try {
          const parsed = JSON.parse(req.body.photos);
          if (Array.isArray(parsed)) photos = parsed;
        } catch {
          // sinon on considère que c’est juste une URL simple
          photos = [req.body.photos];
        }
      }
    }

    const newEvent = await EventModel.create({
      title,
      description,
      location,
      date: eventDate,
      end_date: eventEndDate,
      price,
      organizer_id,
      photos, // tableau d’URL vers les images
    });

    res.status(201).json(newEvent);
  } catch (err) {
    next(err);
  }
};

/* -------------------- Mettre à jour un événement (avec photos) -------------------- */
// src/controllers/eventsController.js
export const updateEvent = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const event = await EventModel.findById(id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (req.user.role !== "admin" && req.user.role !== "super_user" && event.organizer_id !== req.user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const fields = { ...req.body };

    if (fields.date || fields.end_date) {
      const startDate = fields.date
        ? new Date(fields.date)
        : new Date(event.date);
      const endDate = fields.end_date
        ? new Date(fields.end_date)
        : new Date(event.end_date || event.date);

      if (isNaN(startDate)) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      if (isNaN(endDate)) {
        return res.status(400).json({ message: "Invalid end_date format" });
      }

      if (endDate < startDate) {
        return res.status(400).json({ message: "end_date must be after date" });
      }
    }

    // Normalize existing photos sent from the client (JSON string or array)
    let existingPhotos = [];
    if (fields.photos) {
      if (Array.isArray(fields.photos)) existingPhotos = fields.photos;
      else if (typeof fields.photos === 'string') {
        try {
          const parsed = JSON.parse(fields.photos);
          if (Array.isArray(parsed)) existingPhotos = parsed;
          else existingPhotos = [fields.photos];
        } catch {
          existingPhotos = [fields.photos];
        }
      }
    }

    if (Array.isArray(req.files) && req.files.length > 0) {
      const uploadedPhotos = await resolveEventPhotoUrls(req.files);
      // Combine kept existing photos with newly uploaded ones
      fields.photos = [...existingPhotos, ...uploadedPhotos];
    } else if (existingPhotos.length > 0) {
      fields.photos = existingPhotos;
    }

    await EventModel.update(id, fields);
    res.json({ message: "Updated" });
  } catch (err) {
    next(err);
  }
};


/* -------------------- Supprimer un événement -------------------- */
export const deleteEvent = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid event id' });

    const event = await EventModel.findById(id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Seul le créateur ou un admin peut supprimer
    if (req.user.role !== 'admin' && req.user.role !== 'super_user' && event.organizer_id !== req.user.id) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    await EventModel.delete(id);
    return res.status(204).end();
  } catch (err) { next(err); }
};

/* -------------------- Lister mes événements (organisateur/admin) -------------------- */
export const listMyEvents = async (req, res, next) => {
  try {
    const organizerId = Number(req.user.id);
    if (Number.isNaN(organizerId)) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const rows = await EventModel.findByOrganizer(organizerId);
    res.json(rows);
  } catch (err) { next(err); }
};
