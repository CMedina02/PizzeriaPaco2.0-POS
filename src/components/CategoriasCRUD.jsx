import { useState, useEffect } from "react";
import { obtenerTodasLasCategorias, crearCategoria, actualizarCategoria, eliminarCategoria } from "../services/adminService";
import "./ProductosCRUD.css"; // Reutilizamos el CSS del CRUD anterior

function CategoriasCRUD() {
  const [categorias, setCategorias] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [categoriaEnEdicion, setCategoriaEnEdicion] = useState(null);
  
  const [formData, setFormData] = useState({ nombre: "" });

  async function cargarDatos() {
    try {
      const lista = await obtenerTodasLasCategorias();
      setCategorias(lista);
    } catch (error) {
      console.error("Error al cargar categorías:", error);
    }
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  function abrirModalNuevo() {
    setCategoriaEnEdicion(null);
    setFormData({ nombre: "" });
    setModalVisible(true);
  }

  function abrirModalEditar(categoria) {
    setCategoriaEnEdicion(categoria);
    setFormData({ id: categoria.id, nombre: categoria.nombre });
    setModalVisible(true);
  }

  function cerrarModal() {
    setModalVisible(false);
    setCategoriaEnEdicion(null);
  }

  async function manejarEnvio(e) {
    e.preventDefault();
    try {
      if (categoriaEnEdicion) {
        await actualizarCategoria(formData.id, formData.nombre);
      } else {
        await crearCategoria(formData.nombre);
      }
      cerrarModal();
      cargarDatos();
    } catch (error) {
      console.error("Error al guardar la categoría:", error);
      alert("Ocurrió un error al guardar.");
    }
  }

  async function manejarEliminacion(id, nombre) {
    if (window.confirm(`¿ESTÁ SEGURO?\nBorrará la categoría "${nombre}".`)) {
      try {
        await eliminarCategoria(id);
        cargarDatos();
      } catch (error) {
        if (error.message === "TIENE_PRODUCTOS") {
          alert("DENEGADO: No puede borrar esta categoría porque tiene productos asignados. Mueva o elimine los productos primero.");
        } else {
          alert("Error interno al eliminar la categoría.");
        }
      }
    }
  }

  return (
    <div className="crud-container">
      <div className="crud-header">
        <h2>Clasificaciones del Menú</h2>
        <button className="btn-nuevo" onClick={abrirModalNuevo}>+ Agregar Categoría</button>
      </div>

      <table className="crud-tabla">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre de la Categoría</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {categorias.map(cat => (
            <tr key={cat.id}>
              <td>{cat.id}</td>
              <td><strong>{cat.nombre}</strong></td>
              <td className="acciones-celda">
                <button className="btn-editar" onClick={() => abrirModalEditar(cat)}>Editar</button>
                <button className="btn-eliminar" onClick={() => manejarEliminacion(cat.id, cat.nombre)}>Borrar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modalVisible && (
        <div className="crud-modal-overlay">
          <div className="crud-modal">
            <h3>{categoriaEnEdicion ? "Editar Categoría" : "Nueva Categoría"}</h3>
            
            <form onSubmit={manejarEnvio}>
              <div className="form-grupo">
                <label>Nombre de la Categoría</label>
                <input 
                  type="text" 
                  required 
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej. Bebidas, Postres..."
                />
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

export default CategoriasCRUD;