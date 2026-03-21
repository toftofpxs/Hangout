import { db } from "../db/index.js";
import { events } from "../db/schema.js";
import { and, desc, eq, isNull, lt, or } from "drizzle-orm";

// Helper pour parser la colonne TEXT `photos` en tableau JS
function mapEventRow(row) {
  if (!row) return null;
  let photos = [];

  if (row.photos) {
    try {
      const parsed = JSON.parse(row.photos);
      if (Array.isArray(parsed)) {
        photos = parsed;
      } else if (typeof parsed === "string") {
        photos = [parsed];
      }
    } catch {
      // si ce n'est pas du JSON valide, on garde une simple valeur
      photos = [row.photos];
    }
  }

  return {
    ...row,
    photos,
  };
}

export const EventModel = {
  async create({ title, description, location, date, end_date, price, organizer_id, photos }) {
    const eventDate = date instanceof Date ? date : new Date(date);
    if (isNaN(eventDate)) throw new Error("Invalid date format");

    const eventEndDate = end_date
      ? (end_date instanceof Date ? end_date : new Date(end_date))
      : eventDate;
    if (isNaN(eventEndDate)) throw new Error("Invalid end_date format");
    if (eventEndDate < eventDate) throw new Error("end_date must be after date");

    const priceStr = price == null ? "0" : String(price);
    const organizerIdNum = Number(organizer_id);
    if (!Number.isFinite(organizerIdNum)) throw new Error("Invalid organizer_id");

    // Normaliser photos pour la BDD : toujours un JSON string ou null
    let photosJson = null;
    if (Array.isArray(photos)) {
      photosJson = JSON.stringify(photos);
    } else if (typeof photos === "string" && photos.trim() !== "") {
      // si une seule URL en string
      photosJson = JSON.stringify([photos]);
    }

    const result = await db.insert(events).values({
      title,
      description,
      location,
      date: eventDate,
      end_date: eventEndDate,
      price: priceStr,
      organizer_id: organizerIdNum,
      photos: photosJson,
    });

    // récupère précisément la ligne insérée
    if (result.insertId) {
      const rows = await db
        .select()
        .from(events)
        .where(eq(events.id, result.insertId));

      return mapEventRow(rows[0] ?? null);
    }

    // fallback: dernier event de cet organizer
    const [row] = await db
      .select()
      .from(events)
      .where(eq(events.organizer_id, organizerIdNum))
      .orderBy(desc(events.id))
      .limit(1);

    return mapEventRow(row ?? null);
  },

  async findByOrganizer(organizerId) {
    const idNum = Number(organizerId);
    if (!Number.isFinite(idNum)) return [];
    const rows = await db
      .select()
      .from(events)
      .where(eq(events.organizer_id, idNum))
      .orderBy(events.date);

    return rows.map(mapEventRow);
  },

  async findAll() {
    await this.deleteExpiredEvents();
    const rows = await db.select().from(events).orderBy(events.date);
    return rows.map(mapEventRow);
  },

  async findById(id) {
    const idNum = Number(id);
    if (!Number.isFinite(idNum)) return null;
    const rows = await db.select().from(events).where(eq(events.id, idNum));
    return mapEventRow(rows[0] || null);
  },

  async update(id, fields) {
    const idNum = Number(id);
    if (!Number.isFinite(idNum)) throw new Error("Invalid id");
    const patch = { ...fields };

    if (patch.date) {
      const d = patch.date instanceof Date ? patch.date : new Date(patch.date);
      if (isNaN(d)) throw new Error("Invalid date format");
      patch.date = d;
    }

    if (patch.end_date) {
      const endD = patch.end_date instanceof Date ? patch.end_date : new Date(patch.end_date);
      if (isNaN(endD)) throw new Error("Invalid end_date format");
      patch.end_date = endD;
    }

    let currentEvent = null;
    if (!patch.date || !patch.end_date) {
      currentEvent = await this.findById(idNum);
    }

    const startDate = patch.date ?? currentEvent?.date;
    const endDate = patch.end_date ?? currentEvent?.end_date ?? startDate;
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      throw new Error("end_date must be after date");
    }

    if (patch.price != null) patch.price = String(patch.price);
    if (patch.organizer_id != null) patch.organizer_id = Number(patch.organizer_id);

    // Gestion de `photos` à la mise à jour
    if (patch.photos != null) {
      if (Array.isArray(patch.photos)) {
        patch.photos = JSON.stringify(patch.photos);
      } else if (typeof patch.photos === "string") {
        // soit déjà JSON, soit une simple URL
        try {
          const parsed = JSON.parse(patch.photos);
          if (Array.isArray(parsed)) {
            patch.photos = JSON.stringify(parsed);
          } else {
            patch.photos = JSON.stringify([patch.photos]);
          }
        } catch {
          patch.photos = JSON.stringify([patch.photos]);
        }
      } else {
        // tout autre type => on nettoie
        patch.photos = null;
      }
    }

    await db.update(events).set(patch).where(eq(events.id, idNum));
    return true;
  },

  async delete(id) {
    const idNum = Number(id);
    if (!Number.isFinite(idNum)) return false;
    await db.delete(events).where(eq(events.id, idNum));
    return true;
  },

  async deleteExpiredEvents() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 1);
    await db.delete(events).where(
      or(
        lt(events.end_date, cutoff),
        and(isNull(events.end_date), lt(events.date, cutoff))
      )
    );
  },
};


