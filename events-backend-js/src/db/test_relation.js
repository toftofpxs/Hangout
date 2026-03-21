import { db } from "./index.js";
import { users, events, inscriptions, payments } from "./schema.js";

async function testRelations() {
  try {
    console.log("🧠 Test Drizzle ORM – relations");

    // 1️⃣ Ajout utilisateur
    const resultUser = await db.insert(users).values({
      name: "Alice Dupont",
      email: "alice@example.com",
      password_hash: "hashedpassword",
      role: "participant",
    });
    const userId = resultUser[0].insertId;
    console.log("✅ Utilisateur ajouté avec ID :", userId);

    // 2️⃣ Ajout event
    const resultEvent = await db.insert(events).values({
      title: "Salon Tech 2025",
      description: "Un grand salon de la tech",
      location: "Paris",
      organizer_id: userId,
      price: "49.99",
    });
    const eventId = resultEvent[0].insertId;
    console.log("✅ Événement ajouté avec ID :", eventId);

    // 3️⃣ Ajout inscription
    const resultInscription = await db.insert(inscriptions).values({
      user_id: userId,
      event_id: eventId,
      status: "confirmed",
    });
    const inscriptionId = resultInscription[0].insertId;
    console.log("✅ Inscription créée avec ID :", inscriptionId);

    // 4️⃣ Ajout paiement
    const resultPayment = await db.insert(payments).values({
      user_id: userId,
      event_id: eventId,
      amount: "49.99",
      status: "paid",
    });
    const paymentId = resultPayment[0].insertId;
    console.log("✅ Paiement ajouté avec ID :", paymentId);

    // 5️⃣ Lecture avec relations
    const usersWithEvents = await db.query.users.findMany({
      with: {
        events: true,
        inscriptions: true,
        payments: true,
      },
    });

    console.log("📦 Données liées :");
    console.dir(usersWithEvents, { depth: null });
  } catch (err) {
    console.error("❌ Erreur pendant le test :", err);
  } finally {
    process.exit();
  }
}

testRelations();
