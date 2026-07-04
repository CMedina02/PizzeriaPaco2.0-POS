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
 * Descuenta inventario físico (Masas y Cajas) por cada pizza vendida.
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

    // NUEVO: Variable para contar cuántas pizzas hay en la orden
    let cantidadPizzas = 0;

    // Inserción de los detalles resolviendo las llaves foráneas
    for (const item of comanda) {
      // Si el producto pertenece a la categoría 1 (Pizzas), sumamos al contador
      if (item.categoria_id === 1) {
        cantidadPizzas++;
      }

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

    // NUEVO: Descontamos del inventario físico (Masas y Cajas) de manera atómica
    if (cantidadPizzas > 0) {
      await db.execute(
        "UPDATE insumos SET stock = stock - $1 WHERE nombre = 'Masa de Pizza'",
        [cantidadPizzas]
      );
      await db.execute(
        "UPDATE insumos SET stock = stock - $1 WHERE nombre = 'Caja de Pizza'",
        [cantidadPizzas]
      );
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