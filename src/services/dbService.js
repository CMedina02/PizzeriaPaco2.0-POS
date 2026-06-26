import Database from "@tauri-apps/plugin-sql";

// Variable global privada que mantiene la conexión en memoria
let dbInstance = null;

/**
 * Obtiene la conexión activa a la base de datos.
 * Implementa el patrón Singleton para garantizar una única instancia.
 * @returns {Promise<Database>} Instancia de la conexión SQLite.
 */
export async function getDbConnection() {
  if (!dbInstance) {
    try {
      dbInstance = await Database.load("sqlite:pizzeria.db");
      console.log("Conexión a SQLite inicializada correctamente bajo patrón Singleton.");
    } catch (error) {
      console.error("Fallo crítico al inicializar la base de datos:", error);
      throw error;
    }
  }
  return dbInstance;
}