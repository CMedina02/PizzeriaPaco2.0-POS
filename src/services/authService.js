import { getDbConnection } from "./dbService";

/**
 * Verifica si existe al menos un usuario en la base de datos.
 * Si no existe, crea el usuario "Cajero Turno 1" con el PIN "1234".
 */
export async function asegurarUsuarioDefault() {
  try {
    const db = await getDbConnection();
    const userCount = await db.select("SELECT COUNT(*) as total FROM usuarios");
    
    if (userCount[0].total === 0) {
      await db.execute(
        "INSERT INTO usuarios (nombre, pin_acceso, rol) VALUES ('Cajero Turno 1', '1234', 'cajero')"
      );
    }
  } catch (error) {
    console.error("Error al preparar usuario por defecto:", error);
    throw error;
  }
}

/**
 * Valida el PIN y gestiona la concurrencia de sesiones bajo una transacción estricta.
 * @param {string} pin - PIN de 4 dígitos ingresado por el usuario.
 * @param {number|string} fondo - Cantidad de efectivo inicial propuesta.
 * @returns {Promise<Object>} Objeto indicando si la sesión es nueva o reanudada.
 */
export async function procesarAperturaCaja(pin, fondo) {
  const db = await getDbConnection();

  // 1. Validar identidad
  const usuarios = await db.select("SELECT * FROM usuarios WHERE pin_acceso = $1", [pin]);
  if (usuarios.length === 0) {
    throw new Error("PIN_INCORRECTO");
  }
  const usuario = usuarios[0];

  // 2. Control estricto de concurrencia
  await db.execute("BEGIN TRANSACTION");

  try {
    const sesionesAbiertas = await db.select("SELECT id, fondo_inicial FROM sesiones_caja WHERE estado = 'Abierta'");

    if (sesionesAbiertas.length > 1) {
      throw new Error("MULTIPLES_SESIONES");
    }

    // Escenario A: Existe un turno sin cerrar. Se reanuda.
    if (sesionesAbiertas.length === 1) {
      await db.execute("COMMIT");
      return { operacion: "REANUDACION", fondoReal: parseFloat(sesionesAbiertas[0].fondo_inicial) };
    }

    // Escenario B: Creación de nueva sesión
    const fechaApertura = new Date().toISOString();
    await db.execute(
      "INSERT INTO sesiones_caja (usuario_abrio_id, fecha_hora_apertura, fondo_inicial, estado) VALUES ($1, $2, $3, 'Abierta')",
      [usuario.id, fechaApertura, parseFloat(fondo)]
    );

    await db.execute("COMMIT");
    return { operacion: "NUEVA_APERTURA", fondoReal: parseFloat(fondo) };
    
  } catch (error) {
    await db.execute("ROLLBACK");
    throw error;
  }
}