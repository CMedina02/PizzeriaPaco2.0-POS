import { getDbConnection } from "./dbService";

/**
 * Verifica y garantiza la existencia de las cuentas base del sistema.
 */
export async function asegurarUsuarioDefault() {
  try {
    const db = await getDbConnection();
    
    // Parche de seguridad: Forzar los roles correctos por si la BD local está desincronizada
    await db.execute("UPDATE usuarios SET rol = 'cajero' WHERE pin_acceso = '1234'");
    await db.execute("UPDATE usuarios SET rol = 'admin' WHERE pin_acceso = '9999'");

    // 1. Asegurar cuenta de Cajero
    const cajeroCount = await db.select("SELECT COUNT(*) as total FROM usuarios WHERE pin_acceso = '1234'");
    if (cajeroCount[0].total === 0) {
      await db.execute(
        "INSERT INTO usuarios (nombre, pin_acceso, rol) VALUES ('Cajero Turno 1', '1234', 'cajero')"
      );
    }

    // 2. Asegurar cuenta de Administrador
    const adminCount = await db.select("SELECT COUNT(*) as total FROM usuarios WHERE pin_acceso = '9999'");
    if (adminCount[0].total === 0) {
      await db.execute(
        "INSERT INTO usuarios (nombre, pin_acceso, rol) VALUES ('Administrador General', '9999', 'admin')"
      );
    }
  } catch (error) {
    console.error("Error al preparar usuarios del sistema:", error);
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