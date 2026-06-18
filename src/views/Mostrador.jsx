import { useState, useEffect } from "react";
import Database from "@tauri-apps/plugin-sql";
import ModalMitad from "../components/ModalMitad";
import "./Mostrador.css";

function Mostrador() {
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState(null);
  const [comanda, setComanda] = useState([]);
  const [pizzaEnEdicion, setPizzaEnEdicion] = useState(null);

  async function inicializarDatos() {
    try {
      const db = await Database.load("sqlite:pizzeria.db");
      const categoriasDB = await db.select("SELECT * FROM categorias");
      const productosDB = await db.select("SELECT * FROM productos");

      setCategorias(categoriasDB);
      setProductos(productosDB);

      if (categoriasDB.length > 0) {
        setCategoriaActiva(categoriasDB[0].id);
      }
    } catch (error) {
      console.error("Error al cargar la base de datos:", error);
    }
  }

  useEffect(() => {
    inicializarDatos();
  }, []);

  function procesarClickProducto(producto) {
    if (producto.categoria_id === 1) {
      setPizzaEnEdicion(producto);
    } else {
      setComanda([...comanda, { ...producto, producto_id: producto.id }]);
    }
  }

  function agregarItemPersonalizado(item) {
    setComanda([...comanda, item]);
    setPizzaEnEdicion(null);
  }

  const productosFiltrados = productos.filter(p => p.categoria_id === categoriaActiva);
  const totalComanda = comanda.reduce((suma, item) => suma + item.precio_base, 0);

  async function cobrarOrden() {
    try {
      const db = await Database.load("sqlite:pizzeria.db");
      
      const sesion = await db.select("SELECT id FROM sesiones_caja WHERE estado = 'Abierta' LIMIT 1");
      const sesionId = sesion[0].id;

      // 1. Insertamos Cabecera Atómicamente
      const resultadoPedido = await db.select(
        "INSERT INTO pedidos (sesion_caja_id, fecha_hora, total, metodo_pago, estado_pedido, es_para_entrega) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        [sesionId, new Date().toISOString(), totalComanda, 'Efectivo', 'Pagado', 0]
      );
      
      const pedidoId = resultadoPedido[0].id;

      // 2. Insertamos Detalle evadiendo las llaves foráneas rotas
      for (const item of comanda) {
        let finalProductId = item.producto_id;

        // Si es una pizza combinada, la creamos como un producto nuevo "al vuelo"
        if (item.sabor2_id) {
          const resNuevoProd = await db.select(
            "INSERT INTO productos (categoria_id, nombre, precio_base) VALUES (1, $1, $2) RETURNING id",
            [item.nombre, item.precio_base]
          );
          finalProductId = resNuevoProd[0].id;
        }

        // Guardamos el detalle limpio, usando solo el ID del producto
        await db.execute(
          "INSERT INTO detalle_pedidos (pedido_id, producto_id, cantidad, precio_cobrado) VALUES ($1, $2, $3, $4)",
          [pedidoId, finalProductId, 1, item.precio_base]
        );
      }

      setComanda([]);
      inicializarDatos(); // Recarga el catálogo para mostrar la nueva combinación
      alert(`¡Cobro exitoso!\nTicket Folio: #${pedidoId} registrado correctamente.`);

    } catch (error) {
      console.error("Error crítico al procesar el cobro:", error);
      alert("Error al procesar el pago. Revisa la consola.");
    }
  }

  return (
    <div className="mostrador-layout">
      {pizzaEnEdicion && (
        <ModalMitad 
          pizzaInicial={pizzaEnEdicion}
          productosDisponibles={productos}
          onConfirmar={agregarItemPersonalizado}
          onCancelar={() => setPizzaEnEdicion(null)}
        />
      )}

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
              onClick={() => procesarClickProducto(prod)}
            >
              <h4>{prod.nombre}</h4>
              <span className="precio">${prod.precio_base.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </section>

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