import { getDbConnection } from "./dbService";

// =========================================================
// MÓDULO DE ARQUEO Y CORTE DE CAJA (FASE 2)
// =========================================================

export async function obtenerDatosCorte() {
  const db = await getDbConnection();

  const sesion = await db.select("SELECT * FROM sesiones_caja WHERE estado = 'Abierta' LIMIT 1");
  if (sesion.length === 0) {
    throw new Error("NO_HAY_SESION");
  }

  const idSesion = sesion[0].id;
  const fondoInicial = parseFloat(sesion[0].fondo_inicial);

  const ventas = await db.select(
    "SELECT SUM(total) as totalVentas, COUNT(id) as pedidosRealizados FROM pedidos WHERE sesion_caja_id = $1 AND estado_pedido = 'Pagado'",
    [idSesion]
  );

  const totalVentas = parseFloat(ventas[0].totalVentas || 0);
  const pedidosRealizados = parseInt(ventas[0].pedidosRealizados || 0);
  const esperadoCaja = fondoInicial + totalVentas;

  return {
    fondoInicial,
    totalVentas,
    pedidosRealizados,
    esperadoCaja,
    idSesion
  };
}

export async function ejecutarCierreTurno(idSesion) {
  const db = await getDbConnection();
  const fechaCierre = new Date().toISOString();
  await db.execute(
    "UPDATE sesiones_caja SET estado = 'Cerrada', fecha_hora_cierre = $1 WHERE id = $2",
    [fechaCierre, idSesion]
  );
}

// =========================================================
// MÓDULO CRUD DE PRODUCTOS (FASE 3)
// =========================================================

export async function obtenerTodosLosProductos() {
  const db = await getDbConnection();
  return await db.select(`
    SELECT p.id, p.nombre, p.precio_base, p.categoria_id, c.nombre as categoria_nombre 
    FROM productos p 
    LEFT JOIN categorias c ON p.categoria_id = c.id
    ORDER BY p.categoria_id, p.nombre
  `);
}

export async function crearProducto(nombre, precio_base, categoria_id) {
  const db = await getDbConnection();
  await db.execute(
    "INSERT INTO productos (nombre, precio_base, categoria_id) VALUES ($1, $2, $3)",
    [nombre, parseFloat(precio_base), parseInt(categoria_id)]
  );
}

export async function actualizarProducto(id, nombre, precio_base, categoria_id) {
  const db = await getDbConnection();
  await db.execute(
    "UPDATE productos SET nombre = $1, precio_base = $2, categoria_id = $3 WHERE id = $4",
    [nombre, parseFloat(precio_base), parseInt(categoria_id), id]
  );
}

export async function eliminarProducto(id) {
  const db = await getDbConnection();
  await db.execute("DELETE FROM productos WHERE id = $1", [id]);
}

// =========================================================
// MÓDULO CRUD DE CATEGORÍAS (FASE 3)
// =========================================================

export async function obtenerTodasLasCategorias() {
  const db = await getDbConnection();
  return await db.select("SELECT * FROM categorias ORDER BY id");
}

export async function crearCategoria(nombre) {
  const db = await getDbConnection();
  await db.execute("INSERT INTO categorias (nombre) VALUES ($1)", [nombre]);
}

export async function actualizarCategoria(id, nombre) {
  const db = await getDbConnection();
  await db.execute("UPDATE categorias SET nombre = $1 WHERE id = $2", [nombre, id]);
}

export async function eliminarCategoria(id) {
  const db = await getDbConnection();

  // Blindaje relacional: Evitar borrar categorías en uso
  const productos = await db.select("SELECT COUNT(*) as total FROM productos WHERE categoria_id = $1", [id]);
  if (productos[0].total > 0) {
    throw new Error("TIENE_PRODUCTOS");
  }

  await db.execute("DELETE FROM categorias WHERE id = $1", [id]);
}

// =========================================================
// MÓDULO DE AUDITORÍA Y HISTORIAL (FASE 3)
// =========================================================

export async function obtenerHistorialVentas() {
  const db = await getDbConnection();
  return await db.select(`
    SELECT id as folio, fecha_hora, total, estado_pedido as estado
    FROM pedidos
    WHERE estado_pedido = 'Pagado'
    ORDER BY fecha_hora DESC
    LIMIT 100
  `);
}
// =========================================================
// MÓDULO DE INVENTARIO FÍSICO (INSUMOS)
// =========================================================

export async function obtenerInsumos() {
  const db = await getDbConnection();
  return await db.select("SELECT * FROM insumos ORDER BY id");
}

export async function agregarStockInsumo(id, cantidadAgregar) {
  const db = await getDbConnection();
  await db.execute("UPDATE insumos SET stock = stock + $1 WHERE id = $2", [parseInt(cantidadAgregar), id]);
}
// =========================================================
// MÓDULO DE RECURSOS HUMANOS (EMPLEADOS)
// =========================================================

export async function obtenerEmpleados() {
  const db = await getDbConnection();
  // Solo traemos a los cajeros para que el Admin no se borre a sí mismo por accidente
  return await db.select("SELECT id, nombre, pin_acceso FROM usuarios WHERE rol = 'cajero' ORDER BY id");
}

export async function crearEmpleado(nombre, pin) {
  const db = await getDbConnection();

  // Validamos que el PIN no exista ya en el sistema
  const existe = await db.select("SELECT id FROM usuarios WHERE pin_acceso = $1", [pin]);
  if (existe.length > 0) {
    throw new Error("PIN_DUPLICADO");
  }

  await db.execute(
    "INSERT INTO usuarios (nombre, pin_acceso, rol) VALUES ($1, $2, 'cajero')",
    [nombre, pin]
  );
}

export async function eliminarEmpleado(id) {
  const db = await getDbConnection();
  await db.execute("DELETE FROM usuarios WHERE id = $1", [id]);
}

export async function actualizarPinAdmin(nuevoPin) {
  const db = await getDbConnection();

  // Validamos que el PIN no esté en uso por nadie más
  const existe = await db.select("SELECT id FROM usuarios WHERE pin_acceso = $1", [nuevoPin]);
  if (existe.length > 0) {
    throw new Error("PIN_DUPLICADO");
  }

  // Actualizamos específicamente la cuenta del administrador
  await db.execute("UPDATE usuarios SET pin_acceso = $1 WHERE rol = 'admin'", [nuevoPin]);
}