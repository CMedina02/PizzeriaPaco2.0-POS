import { useState, useEffect } from "react";
import { obtenerCatalogo, procesarCobro } from "../services/posService";
import ModalMitad from "../components/ModalMitad";
import TicketModal from "../components/TicketModal";
import "./Mostrador.css";

function Mostrador({ onIrACorte, rolUsuario, onVolverAdmin }) {
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState(null);
  const [comanda, setComanda] = useState([]);
  const [pizzaEnEdicion, setPizzaEnEdicion] = useState(null);
  const [ticketGenerado, setTicketGenerado] = useState(null);

  useEffect(() => {
    async function cargarDatos() {
      try {
        const datos = await obtenerCatalogo();
        setCategorias(datos.categorias);
        setProductos(datos.productos);

        if (datos.categorias.length > 0) {
          setCategoriaActiva(datos.categorias[0].id);
        }
      } catch (error) {
        console.error("Error al cargar el catálogo desde el servicio:", error);
      }
    }
    
    cargarDatos();
  }, []);

  function procesarClickProducto(producto) {
    if (producto.categoria_id === 1) {
      setPizzaEnEdicion(producto);
    } else {
      setComanda([...comanda, { ...producto, producto_id: producto.id, sabor1_id: null, sabor2_id: null }]);
    }
  }

  function agregarItemPersonalizado(item) {
    setComanda([...comanda, item]);
    setPizzaEnEdicion(null);
  }

  function eliminarDeComanda(indiceAEliminar) {
    const nuevaComanda = comanda.filter((_, index) => index !== indiceAEliminar);
    setComanda(nuevaComanda);
  }

  const productosFiltrados = productos.filter(p => p.categoria_id === categoriaActiva);
  const totalComanda = comanda.reduce((suma, item) => suma + item.precio_base, 0);

  async function ejecutarCobro() {
    try {
      const pedidoId = await procesarCobro(comanda, totalComanda);
      
      setTicketGenerado({
        folio: pedidoId,
        comanda: [...comanda],
        total: totalComanda
      });
      
      setComanda([]);
    } catch (error) {
      console.error("Error crítico en la transacción:", error);
      if (error.message === "CAJA_CERRADA") {
        alert("Operación denegada: No hay una sesión de caja abierta.");
      } else {
        alert("Error al procesar el pago. Revise la consola técnica.");
      }
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

      {ticketGenerado && (
        <TicketModal 
          folio={ticketGenerado.folio}
          comanda={ticketGenerado.comanda}
          total={ticketGenerado.total}
          onCerrar={() => setTicketGenerado(null)}
        />
      )}

      <section className="seccion-menu">
        <header className="menu-header">
          <h2>Menú Digital</h2>
          
          <div className="header-acciones">
            <button onClick={onIrACorte} className="btn-accion-header">
              Ir a Corte de Caja
            </button>
            
            {rolUsuario === 'admin' && (
              <button onClick={onVolverAdmin} className="btn-accion-header volver-admin">
                Volver a Panel Gerencial
              </button>
            )}
          </div>

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
                  <div className="item-precio-acciones">
                    <strong>${item.precio_base.toFixed(2)}</strong>
                    <button 
                      onClick={() => eliminarDeComanda(index)}
                      className="btn-eliminar-item"
                      title="Quitar de la orden"
                    >
                      X
                    </button>
                  </div>
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
            onClick={ejecutarCobro}
          >
            Cobrar Orden
          </button>
        </footer>
      </aside>
    </div>
  );
}

export default Mostrador;