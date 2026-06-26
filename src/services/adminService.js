import { getDbConnection } from "./dbService";

/**
 * Obtiene los totales de ventas y el fondo inicial de la sesión actual.
 * @returns {Promise<Object>} Objeto con los datos consolidados del turno.
 */
export async function obtenerDatosCorte() {
  const db = await getDbConnection();

  const sesion = await db.select("SELECT * FROM sesiones_caja WHERE estado = 'Abierta' LIMIT 1");
  if (sesion.length === 0) {
    throw new Error("NO_HAY_SESION");
  }

  const idSesionActual = sesion[0].id;
  const fondo = parseFloat(sesion[0].fondo_inicial);

  const ventas = await db.select(
    "SELECT COUNT(id) as cantidad_pedidos, SUM(total) as total_ingresos FROM pedidos WHERE sesion_caja_id = $1",
    [idSesionActual]
  );

  const totalIngresos = ventas[0].total_ingresos ? parseFloat(ventas[0].total_ingresos) : 0;
  const pedidos = ventas[0].cantidad_pedidos || 0;

  return {
    fondoInicial: fondo,
    totalVentas: totalIngresos,
    pedidosRealizados: pedidos,
    esperadoCaja: fondo + totalIngresos,
    idSesion: idSesionActual
  };
}

/**
 * Marca la sesión activa como 'Cerrada' y registra la fecha y hora.
 * @param {number} idSesion - ID de la sesión a cerrar.
 */
export async function ejecutarCierreTurno(idSesion) {
  const db = await getDbConnection();
  const fechaCierre = new Date().toISOString();

  await db.execute(
    "UPDATE sesiones_caja SET estado = 'Cerrada', fecha_hora_cierre = $1 WHERE id = $2",
    [fechaCierre, idSesion]
  );
}