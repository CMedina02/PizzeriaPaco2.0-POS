import { getDbConnection } from "./dbService.js";
import {
  esPinPredeterminado,
  esPinValido,
  hashearPin,
  requiereMigracionPin,
  verificarPin,
} from "./pinSecurity.js";

/**
 * Prepara las tablas auxiliares sin crear, modificar ni eliminar usuarios.
 * @returns {Promise<{requiereConfiguracionInicial: boolean, sinAdministrador: boolean}>}
 * Estado de usuarios sin modificar las cuentas existentes.
 */
export async function asegurarUsuarioDefault(database = null) {
  try {
    const db = database ?? await getDbConnection();

    await db.execute(`
      CREATE TABLE IF NOT EXISTS insumos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE,
        stock INTEGER DEFAULT 0
      )
    `);

    await db.execute("INSERT OR IGNORE INTO insumos (nombre, stock) VALUES ('Masa de Pizza', 0)");
    await db.execute("INSERT OR IGNORE INTO insumos (nombre, stock) VALUES ('Caja de Pizza', 0)");

    const usuarios = await db.select("SELECT COUNT(*) as total FROM usuarios");
    const administradores = await db.select("SELECT COUNT(*) as total FROM usuarios WHERE rol = 'admin'");
    return {
      requiereConfiguracionInicial: usuarios[0].total === 0,
      sinAdministrador: usuarios[0].total > 0 && administradores[0].total === 0,
    };

  } catch (error) {
    console.error("Error al preparar base de datos del sistema:", error);
    throw error;
  }
}

/**
 * Valida el PIN y gestiona la concurrencia de sesiones.
 * @returns {Promise<Object>} Objeto indicando operacion, fondo y el ROL del usuario.
 */
export async function procesarAperturaCaja(pin, fondo, database = null) {
  if (!esPinValido(pin)) throw new Error("PIN_INCORRECTO");
  const db = database ?? await getDbConnection();
  const usuarios = await db.select("SELECT id, nombre, pin_acceso, rol FROM usuarios ORDER BY id");
  let usuario = null;
  for (const candidato of usuarios) {
    if (await verificarPin(pin, candidato.pin_acceso)) {
      usuario = candidato;
      break;
    }
  }

  if (!usuario) {
    throw new Error("PIN_INCORRECTO");
  }

  if (requiereMigracionPin(usuario.pin_acceso)) {
    const hash = await hashearPin(pin);
    await db.execute(
      "UPDATE usuarios SET pin_acceso = $1 WHERE id = $2 AND pin_acceso = $3",
      [hash, usuario.id, usuario.pin_acceso],
    );
  }

  await db.execute("BEGIN TRANSACTION");

  try {
    const sesionesAbiertas = await db.select("SELECT id, fondo_inicial FROM sesiones_caja WHERE estado = 'Abierta'");

    if (sesionesAbiertas.length > 1) {
      throw new Error("MULTIPLES_SESIONES");
    }

    // Retornamos el rol (usuario.rol) para que React sepa a qué pantalla enviarlo
    if (sesionesAbiertas.length === 1) {
      await db.execute("COMMIT");
      return {
        operacion: "REANUDACION",
        fondoReal: parseFloat(sesionesAbiertas[0].fondo_inicial),
        rol: usuario.rol,
        usuarioId: usuario.id,
        pinPredeterminado: esPinPredeterminado(pin),
      };
    }

    const fechaApertura = new Date().toISOString();
    await db.execute(
      "INSERT INTO sesiones_caja (usuario_abrio_id, fecha_hora_apertura, fondo_inicial, estado) VALUES ($1, $2, $3, 'Abierta')",
      [usuario.id, fechaApertura, parseFloat(fondo)]
    );

    await db.execute("COMMIT");
    return {
      operacion: "NUEVA_APERTURA",
      fondoReal: parseFloat(fondo),
      rol: usuario.rol,
      usuarioId: usuario.id,
      pinPredeterminado: esPinPredeterminado(pin),
    };

  } catch (error) {
    await db.execute("ROLLBACK");
    throw error;
  }
}

/** Crea la cuenta inicial solo después de que el responsable elija nombre y PIN. */
export async function crearAdministradorInicial(nombre, pin, database = null) {
  const nombreLimpio = typeof nombre === "string" ? nombre.trim() : "";
  if (!nombreLimpio || nombreLimpio.length > 50) throw new Error("NOMBRE_INVALIDO");
  if (!esPinValido(pin)) throw new Error("PIN_INVALIDO");
  if (esPinPredeterminado(pin)) throw new Error("PIN_PREDETERMINADO");

  const db = database ?? await getDbConnection();
  await db.execute("BEGIN TRANSACTION");
  try {
    const existentes = await db.select("SELECT COUNT(*) as total FROM usuarios");
    if (existentes[0].total !== 0) throw new Error("USUARIOS_EXISTENTES");
    const hash = await hashearPin(pin);
    await db.execute(
      "INSERT INTO usuarios (nombre, pin_acceso, rol) VALUES ($1, $2, 'admin')",
      [nombreLimpio, hash],
    );
    await db.execute("COMMIT");
  } catch (error) {
    await db.execute("ROLLBACK");
    throw error;
  }
}
