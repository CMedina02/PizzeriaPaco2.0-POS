import { getDbConnection } from "./dbService";

/**
 * Extrae el catálogo completo de categorías y productos para la interfaz.
 */
export async function obtenerCatalogo() {
  const db = await getDbConnection();
  const categorias = await db.select("SELECT * FROM categorias");
  const productos = await db.select("SELECT * FROM productos");
  return { categorias, productos };
}

/**
 * Función interna para gestionar la integridad de la tabla sabores_producto.
 */
async function registrarObtenerSabor(db, productoId) {
  const saborExistente = await db.select(
    "SELECT id FROM sabores_producto WHERE producto_id = $1",
    [productoId]
  );

  if (saborExistente.length > 0) {
    return saborExistente[0].id;
  }

  const producto = await db.select(
    "SELECT nombre FROM productos WHERE id = $1",
    [productoId]
  );
  
  if (producto.length === 0) return null;

  const nuevoSabor = await db.select(
    "INSERT INTO sabores_producto (producto_id, nombre_sabor) VALUES ($1, $2) RETURNING id",
    [productoId, producto[0].nombre]
  );

  return nuevoSabor[0].id;
}

/**
 * Procesa la orden de cobro utilizando transacciones atómicas.
 * Garantiza que no existan cobros parciales en caso de fallos del sistema.
 * @param {Array} comanda - Arreglo de productos a cobrar.
 * @param {number} totalComanda - Suma total del importe.
 * @returns {Promise<number>} ID del pedido (Folio).
 */
export async function procesarCobro(comanda, totalComanda) {
  const db = await getDbConnection();

  // 1. Validaciones previas a la transacción
  const sesion = await db.select("SELECT id FROM sesiones_caja WHERE estado = 'Abierta' LIMIT 1");
  if (sesion.length === 0) {
    throw new Error("CAJA_CERRADA");
  }
  const sesionId = sesion[0].id;

  // 2. INICIO DE LA TRANSACCIÓN ATÓMICA
  await db.execute("BEGIN TRANSACTION");

  try {
    // Inserción de la cabecera del pedido
    const resultadoPedido = await db.select(
      "INSERT INTO pedidos (sesion_caja_id, fecha_hora, total, metodo_pago, estado_pedido, es_para_entrega) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [sesionId, new Date().toISOString(), totalComanda, 'Efectivo', 'Pagado', 0]
    );
    
    const pedidoId = resultadoPedido[0].id;

    // Inserción de los detalles resolviendo las llaves foráneas
    for (const item of comanda) {
      let fkSabor1 = null;
      let fkSabor2 = null;

      if (item.sabor1_id) {
        fkSabor1 = await registrarObtenerSabor(db, item.sabor1_id);
      }
      if (item.sabor2_id) {
        fkSabor2 = await registrarObtenerSabor(db, item.sabor2_id);
      }

      let query = "INSERT INTO detalle_pedidos (pedido_id, producto_id, cantidad, precio_cobrado";
      let values = [pedidoId, item.producto_id, 1, item.precio_base];
      let placeholders = "$1, $2, $3, $4";
      let paramIndex = 5;

      if (fkSabor1) {
        query += ", sabor1_id";
        placeholders += `, $${paramIndex}`;
        values.push(fkSabor1);
        paramIndex++;
      }

      if (fkSabor2) {
        query += ", sabor2_id";
        placeholders += `, $${paramIndex}`;
        values.push(fkSabor2);
      }

      query += `) VALUES (${placeholders})`;
      await db.execute(query, values);
    }

    // 3. CONFIRMACIÓN: Si el flujo llega hasta aquí sin errores, guardamos los datos físicamente.
    await db.execute("COMMIT");
    
    return pedidoId;

  } catch (error) {
    // 4. REVERSIÓN: Si cualquier instrucción falla, abortamos y deshacemos los cambios parciales.
    await db.execute("ROLLBACK");
    console.error("Transacción de cobro abortada. Cambios revertidos para proteger la integridad:", error);
    
    // Relanzamos el error para que la interfaz (Mostrador.jsx) muestre la alerta al usuario.
    throw error; 
  }
}