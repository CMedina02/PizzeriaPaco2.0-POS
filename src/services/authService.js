import { getDbConnection } from "./dbService";

/**
 * Verifica, corrige y garantiza la existencia de las cuentas base y las tablas de inventario físico.
 */
export async function asegurarUsuarioDefault() {
  try {
    const db = await getDbConnection();

    // 1. PARCHE DE LIMPIEZA: Eliminación de "Administradores Zombie"
    // Buscamos todos los administradores, ordenados del más nuevo al más viejo
    const admins = await db.select("SELECT id FROM usuarios WHERE rol = 'admin' ORDER BY id DESC");

    // Si hay más de un administrador (por el bug anterior), dejamos solo el último y borramos los clones
    if (admins.length > 1) {
      for (let i = 1; i < admins.length; i++) {
        await db.execute("DELETE FROM usuarios WHERE id = $1", [admins[i].id]);
      }
    }

    // 2. Validación de seguridad correcta (por ROL, no por PIN)
    const cajeroCount = await db.select("SELECT COUNT(*) as total FROM usuarios WHERE rol = 'cajero'");
    if (cajeroCount[0].total === 0) {
      await db.execute("INSERT INTO usuarios (nombre, pin_acceso, rol) VALUES ('Cajero Turno 1', '1234', 'cajero')");
    }

    const adminCount = await db.select("SELECT COUNT(*) as total FROM usuarios WHERE rol = 'admin'");
    if (adminCount[0].total === 0) {
      // Solo si de verdad no hay NINGÚN admin, creamos el de fábrica
      await db.execute("INSERT INTO usuarios (nombre, pin_acceso, rol) VALUES ('Administrador General', '9999', 'admin')");
    }

    // 3. Creación de tabla de insumos físicos (Masas y Contenedores)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS insumos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE,
        stock INTEGER DEFAULT 0
      )
    `);

    // Insertamos los insumos base ignorando si ya existen
    await db.execute("INSERT OR IGNORE INTO insumos (nombre, stock) VALUES ('Masa de Pizza', 0)");
    await db.execute("INSERT OR IGNORE INTO insumos (nombre, stock) VALUES ('Caja de Pizza', 0)");

  } catch (error) {
    console.error("Error al preparar base de datos del sistema:", error);
    throw error;
  }
}

/**
 * Valida el PIN y gestiona la concurrencia de sesiones.
 * @returns {Promise<Object>} Objeto indicando operacion, fondo y el ROL del usuario.
 */
export async function procesarAperturaCaja(pin, fondo) {
  const db = await getDbConnection();

  const usuarios = await db.select("SELECT * FROM usuarios WHERE pin_acceso = $1", [pin]);
  if (usuarios.length === 0) {
    throw new Error("PIN_INCORRECTO");
  }
  const usuario = usuarios[0];

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
        rol: usuario.rol
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
      rol: usuario.rol
    };

  } catch (error) {
    await db.execute("ROLLBACK");
    throw error;
  }
}