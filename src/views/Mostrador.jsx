import { useState, useEffect } from "react";
import Database from "@tauri-apps/plugin-sql";
import "./Mostrador.css";

function Mostrador() {
  // 1. Memoria de la aplicación (Estados)
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState(null);
  const [comanda, setComanda] = useState([]); // Este es nuestro carrito/ticket

  // 2. Función para conectar a la base de datos y traer el catálogo
  async function inicializarDatos() {
    try {
      const db = await Database.load("sqlite:pizzeria.db");

      // Truco de desarrollo: Si la base de datos está vacía, inyectamos datos de prueba
      const catCount = await db.select("SELECT COUNT(*) as total FROM categorias");
      if (catCount[0].total === 0) {
        await db.execute("INSERT INTO categorias (nombre) VALUES ('Pizzas'), ('Bebidas')");
        await db.execute("INSERT INTO productos (categoria_id, nombre, precio_base) VALUES (1, 'Pizza Pepperoni', 149.00), (1, 'Pizza Hawaiana', 149.00), (2, 'Refresco de Cola', 35.00)");
      }

      // Cargamos los catálogos reales a la memoria de React
      const categoriasDB = await db.select("SELECT * FROM categorias");
      const productosDB = await db.select("SELECT * FROM productos");

      setCategorias(categoriasDB);
      setProductos(productosDB);

      // Si hay categorías, seleccionamos la primera por defecto para que no inicie en blanco
      if (categoriasDB.length > 0) {
        setCategoriaActiva(categoriasDB[0].id);
      }
    } catch (error) {
      console.error("Error al cargar la base de datos:", error);
    }
  }

  // Se ejecuta automáticamente una sola vez al abrir la pantalla
  useEffect(() => {
    inicializarDatos();
  }, []);

  // 3. Lógica del Cajero: Simular el "toque" en la pantalla
  function agregarAComanda(producto) {
    // Tomamos la comanda actual y le sumamos el nuevo producto al final
    setComanda([...comanda, producto]);
  }

  // 4. Lógica de Vista: Filtramos productos por categoría y sumamos el total
  const productosFiltrados = productos.filter(p => p.categoria_id === categoriaActiva);
  const totalComanda = comanda.reduce((suma, item) => suma + item.precio_base, 0);

  // 5. Motor Transaccional: Guardar el ticket en la base de datos
  async function cobrarOrden() {
    try {
      const db = await Database.load("sqlite:pizzeria.db");

      // Paso A: Mock de Seguridad (Crear turno fantasma si no existe)
      const userCount = await db.select("SELECT COUNT(*) as total FROM usuarios");
      if (userCount[0].total === 0) {
        await db.execute("INSERT INTO usuarios (nombre, pin_acceso, rol) VALUES ('Admin', '1234', 'admin')");
        // Insertamos la fecha en formato ISO para la apertura de caja
        const fechaApertura = new Date().toISOString();
        await db.execute("INSERT INTO sesiones_caja (usuario_abrio_id, fecha_hora_apertura, fondo_inicial, estado) VALUES (1, $1, 500.0, 'Abierta')", [fechaApertura]);
      }

      // Obtenemos el ID de la sesión activa
      const sesion = await db.select("SELECT id FROM sesiones_caja WHERE estado = 'Abierta' LIMIT 1");
      const sesionId = sesion[0].id;

      // Paso B: Insertar la Cabecera del Pedido
      const fechaHoraPedido = new Date().toISOString();
      const resultadoPedido = await db.execute(
        "INSERT INTO pedidos (sesion_caja_id, fecha_hora, total, metodo_pago, estado_pedido, es_para_entrega) VALUES ($1, $2, $3, $4, $5, $6)",
        [sesionId, fechaHoraPedido, totalComanda, 'Efectivo', 'Pagado', 0]
      );

      // Tauri nos devuelve el ID (folio) que SQLite le asignó automáticamente a este pedido
      const pedidoId = resultadoPedido.lastInsertId;

      // Paso C: Insertar el Detalle del Pedido (Línea por línea)
      for (const item of comanda) {
        await db.execute(
          "INSERT INTO detalle_pedidos (pedido_id, producto_id, cantidad, precio_cobrado) VALUES ($1, $2, $3, $4)",
          [pedidoId, item.id, 1, item.precio_base]
        );
      }

      // Paso D: Limpiar el mostrador para el siguiente cliente en la fila
      setComanda([]);
      alert(`¡Cobro exitoso!\nTicket Folio: #${pedidoId} registrado correctamente.`);

    } catch (error) {
      console.error("Error crítico al procesar el cobro:", error);
      alert("Error al procesar el pago. Revisa la consola.");
    }
  }

  return (
    <div className="mostrador-layout">
      {/* PANEL IZQUIERDO: CATÁLOGO DINÁMICO */}
      <section className="seccion-menu">
        <header className="menu-header">
          <h2>Menú Digital</h2>
          <div className="categorias-bar">
            {categorias.map(cat => (
              <button
                key={cat.id}
                className={`tab-categoria ${categoriaActiva === cat.id ? 'activa' : ''}`}
                onClick={() => setCategoriaActiva(cat.id)}
              >
                {cat.nombre}
              </button>
            ))}
          </div>
        </header>

        <div className="cuadricula-productos">
          {productosFiltrados.map(prod => (
            <div
              key={prod.id}
              className="producto-card"
              onClick={() => agregarAComanda(prod)}
            >
              <h4>{prod.nombre}</h4>
              <span className="precio">${prod.precio_base.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* PANEL DERECHO: TICKET INTERACTIVO (Refactorizado) */}
      <aside className="seccion-comanda">
        <h3>Orden Actual</h3>
        
        <div className={`lista-items ${comanda.length === 0 ? 'vacia' : 'con-elementos'}`}>
          {comanda.length === 0 ? (
            <p className="vacio-txt">La comanda está vacía</p>
          ) : (
            <ul className="comanda-lista">
              {comanda.map((item, index) => (
                <li key={index} className="comanda-item">
                  <span>{item.nombre}</span>
                  <strong>${item.precio_base.toFixed(2)}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="comanda-footer">
          <div className="fila-total">
            <span>Total:</span>
            <strong>${totalComanda.toFixed(2)}</strong>
          </div>
          <button 
            className="btn-cobrar" 
            disabled={comanda.length === 0}
            onClick={cobrarOrden}
          >
            Cobrar Orden
          </button>
        </footer>
      </aside>
    </div>
  );
}

export default Mostrador;