import { db } from "./index.js";
import * as schema from "./schema.js";

async function testDB() {
  try {
    // Essaie de récupérer les 5 premières lignes d'une table (remplace par la tienne)
    const result = await db.select().from(schema.users).limit(5);

    console.log("Connexion réussie !");
    console.log(result);
  } catch (error) {
    console.error(" Erreur lors du test de la connexion :", error);
  }
}

testDB();
