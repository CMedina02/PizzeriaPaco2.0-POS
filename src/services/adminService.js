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

// =========================================================
// MÓDULO CRUD DE PRODUCTOS
// =========================================================

/**
 * Obtiene la lista completa de productos incluyendo el nombre de su categoría.
 */
export async function obtenerTodosLosProductos() {
  const db = await getDbConnection();
  return await db.select(`
    SELECT p.id, p.nombre, p.precio_base, p.categoria_id, c.nombre as categoria_nombre 
    FROM productos p 
    LEFT JOIN categorias c ON p.categoria_id = c.id
    ORDER BY p.categoria_id, p.nombre
  `);
}

/**
 * Crea un nuevo producto en el catálogo.
 */
export async function crearProducto(nombre, precio_base, categoria_id) {
  const db = await getDbConnection();
  await db.execute(
    "INSERT INTO productos (nombre, precio_base, categoria_id) VALUES ($1, $2, $3)",
    [nombre, parseFloat(precio_base), parseInt(categoria_id)]
  );
}

/**
 * Actualiza los datos de un producto existente.
 */
export async function actualizarProducto(id, nombre, precio_base, categoria_id) {
  const db = await getDbConnection();
  await db.execute(
    "UPDATE productos SET nombre = $1, precio_base = $2, categoria_id = $3 WHERE id = $4",
    [nombre, parseFloat(precio_base), parseInt(categoria_id), id]
  );
}

/**
 * Elimina permanentemente un producto de la base de datos.
 */
export async function eliminarProducto(id) {
  const db = await getDbConnection();
  await db.execute("DELETE FROM productos WHERE id = $1", [id]);
}

// =========================================================
// MÓDULO CRUD DE CATEGORÍAS
// =========================================================

/**
 * Obtiene todas las categorías del sistema.
 */
export async function obtenerTodasLasCategorias() {
  const db = await getDbConnection();
  return await db.select("SELECT * FROM categorias ORDER BY id");
}

/**
 * Crea una nueva categoría.
 */
export async function crearCategoria(nombre) {
  const db = await getDbConnection();
  await db.execute("INSERT INTO categorias (nombre) VALUES ($1)", [nombre]);
}

/**
 * Actualiza el nombre de una categoría existente.
 */
export async function actualizarCategoria(id, nombre) {
  const db = await getDbConnection();
  await db.execute("UPDATE categorias SET nombre = $1 WHERE id = $2", [nombre, id]);
}

/**
 * Elimina una categoría, validando previamente que esté vacía.
 */
export async function eliminarCategoria(id) {
  const db = await getDbConnection();
  
  // Blindaje relacional: Evitar borrar categorías en uso
  const productos = await db.select("SELECT COUNT(*) as total FROM productos WHERE categoria_id = $1", [id]);
  if (productos[0].total > 0) {
    throw new Error("TIENE_PRODUCTOS");
  }
  
  await db.execute("DELETE FROM categorias WHERE id = $1", [id]);
}