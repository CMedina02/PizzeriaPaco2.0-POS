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

      {/* PANEL DERECHO: TICKET INTERACTIVO */}
      <aside className="seccion-comanda">
        <h3>Orden Actual</h3>
        <div className="lista-items" style={{ alignItems: comanda.length === 0 ? "center" : "flex-start", padding: "10px 0" }}>
          {comanda.length === 0 ? (
            <p className="vacio-txt">La comanda está vacía</p>
          ) : (
            <ul style={{ width: "100%", padding: 0, listStyle: "none", margin: 0 }}>
              {comanda.map((item, index) => (
                <li key={index} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #f0f0f0", color: "#2c3e50" }}>
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
          {/* El botón se habilita automáticamente solo si hay cosas en el ticket */}
          <button className="btn-cobrar" disabled={comanda.length === 0}>
            Cobrar Turno
          </button>
        </footer>
      </aside>
    </div>
  );
}

export default Mostrador;