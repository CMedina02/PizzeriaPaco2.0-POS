import { useState, useEffect } from "react";
import { obtenerTodosLosProductos, crearProducto, actualizarProducto, eliminarProducto } from "../services/adminService";
import { obtenerCatalogo } from "../services/posService"; // Reutilizamos esto para obtener las categorías
import "./ProductosCRUD.css";

function ProductosCRUD() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Estado para saber si estamos creando (null) o editando (objeto producto)
  const [productoEnEdicion, setProductoEnEdicion] = useState(null);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: "",
    precio_base: "",
    categoria_id: ""
  });

  async function cargarDatos() {
    try {
      const listaProductos = await obtenerTodosLosProductos();
      setProductos(listaProductos);
      
      const catalogo = await obtenerCatalogo();
      setCategorias(catalogo.categorias);
    } catch (error) {
      console.error("Error al cargar datos del CRUD:", error);
    }
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  function abrirModalNuevo() {
    setProductoEnEdicion(null);
    setFormData({ nombre: "", precio_base: "", categoria_id: categorias.length > 0 ? categorias[0].id : "" });
    setModalVisible(true);
  }

  function abrirModalEditar(producto) {
    setProductoEnEdicion(producto);
    setFormData({
      id: producto.id,
      nombre: producto.nombre,
      precio_base: producto.precio_base,
      categoria_id: producto.categoria_id
    });
    setModalVisible(true);
  }

  function cerrarModal() {
    setModalVisible(false);
    setProductoEnEdicion(null);
  }

  async function manejarEnvio(e) {
    e.preventDefault();
    try {
      if (productoEnEdicion) {
        await actualizarProducto(formData.id, formData.nombre, formData.precio_base, formData.categoria_id);
      } else {
        await crearProducto(formData.nombre, formData.precio_base, formData.categoria_id);
      }
      cerrarModal();
      cargarDatos(); // Refresca la tabla automáticamente
    } catch (error) {
      console.error("Error al guardar el producto:", error);
      alert("Ocurrió un error al guardar. Revise la consola.");
    }
  }

  async function manejarEliminacion(id, nombre) {
    if (window.confirm(`¿ESTÁ SEGURO?\nEsto eliminará el producto "${nombre}" permanentemente del sistema.`)) {
      try {
        await eliminarProducto(id);
        cargarDatos();
      } catch (error) {
        console.error("Error al eliminar:", error);
        alert("No se pudo eliminar el producto. Podría estar vinculado a ventas históricas.");
      }
    }
  }

  return (
    <div className="crud-container">
      <div className="crud-header">
        <h2>Inventario Actual</h2>
        <button className="btn-nuevo" onClick={abrirModalNuevo}>+ Agregar Producto</button>
      </div>

      <table className="crud-tabla">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre del Producto</th>
            <th>Categoría</th>
            <th>Precio Base</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {productos.map(prod => (
            <tr key={prod.id}>
              <td>{prod.id}</td>
              <td><strong>{prod.nombre}</strong></td>
              <td>{prod.categoria_nombre || "Sin Categoría"}</td>
              <td>${prod.precio_base.toFixed(2)}</td>
              <td className="acciones-celda">
                <button className="btn-editar" onClick={() => abrirModalEditar(prod)}>Editar</button>
                <button className="btn-eliminar" onClick={() => manejarEliminacion(prod.id, prod.nombre)}>Borrar</button>
              </td>
            </tr>
          ))}
          {productos.length === 0 && (
            <tr>
              <td colSpan="5" style={{ textAlign: "center", padding: "20px" }}>No hay productos registrados.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Ventana Modal (Se muestra solo si modalVisible es true) */}
      {modalVisible && (
        <div className="crud-modal-overlay">
          <div className="crud-modal">
            <h3>{productoEnEdicion ? "Editar Producto" : "Nuevo Producto"}</h3>
            
            <form onSubmit={manejarEnvio}>
              <div className="form-grupo">
                <label>Nombre del Producto</label>
                <input 
                  type="text" 
                  required 
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  placeholder="Ej. Pizza Hawaiana"
                />
              </div>

              <div className="form-grupo">
                <label>Precio de Venta ($)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  required 
                  value={formData.precio_base}
                  onChange={(e) => setFormData({...formData, precio_base: e.target.value})}
                  placeholder="Ej. 150.00"
                />
              </div>

              <div className="form-grupo">
                <label>Categoría</label>
                <select 
                  required
                  value={formData.categoria_id}
                  onChange={(e) => setFormData({...formData, categoria_id: e.target.value})}
                >
                  <option value="" disabled>Seleccione una categoría</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="modal-acciones">
                <button type="button" className="btn-cancelar" onClick={cerrarModal}>Cancelar</button>
                <button type="submit" className="btn-guardar">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductosCRUD;