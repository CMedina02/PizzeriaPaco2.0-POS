import { useState } from "react";
import "./AdminPanel.css";
import ProductosCRUD from "../components/ProductosCRUD";
import CategoriasCRUD from "../components/CategoriasCRUD";
import HistorialVentas from "../components/HistorialVentas";
import GestorInsumos from "../components/GestorInsumos";
import GestorEmpleados from "../components/GestorEmpleados";
// NUEVO: Importamos la función para cambiar el PIN
import { actualizarPinAdmin } from "../services/adminService";

function AdminPanel({ onCerrarSesion, onIrACaja }) {
  const [moduloActivo, setModuloActivo] = useState("productos");

  // Lógica de seguridad para el gerente
  async function manejarCambioPin() {
    const nuevoPin = window.prompt("Seguridad Gerencial\n\nIngrese su nuevo PIN maestro de 4 dígitos:");

    if (!nuevoPin) return; // Si cancela la ventana

    // Limpiamos la entrada para asegurar que solo sean 4 números
    const pinLimpio = nuevoPin.replace(/\D/g, '').slice(0, 4);

    if (pinLimpio.length !== 4) {
      alert("Operación cancelada: El PIN debe contener exactamente 4 números.");
      return;
    }

    try {
      await actualizarPinAdmin(pinLimpio);
      alert(`¡Éxito! Su PIN maestro ha sido actualizado a: ${pinLimpio}\nUse este número en su próximo inicio de sesión.`);
    } catch (error) {
      if (error.message === "PIN_DUPLICADO") {
        alert("Ese PIN ya está en uso por un empleado. Por su seguridad, elija uno distinto.");
      } else {
        alert("Ocurrió un error al intentar cambiar la contraseña.");
      }
    }
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>Panel Gerencial</h2>
        </div>

        <nav className="admin-nav">
          <button
            className={`admin-nav-btn ${moduloActivo === "productos" ? "activo" : ""}`}
            onClick={() => setModuloActivo("productos")}
          >
            Gestión de Productos
          </button>

          <button
            className={`admin-nav-btn ${moduloActivo === "categorias" ? "activo" : ""}`}
            onClick={() => setModuloActivo("categorias")}
          >
            Categorías y Menú
          </button>

          <button
            className={`admin-nav-btn ${moduloActivo === "insumos" ? "activo" : ""}`}
            onClick={() => setModuloActivo("insumos")}
          >
            Inventario Físico
          </button>

          <button
            className={`admin-nav-btn ${moduloActivo === "personal" ? "activo" : ""}`}
            onClick={() => setModuloActivo("personal")}
          >
            Control de Personal
          </button>

          <button
            className={`admin-nav-btn ${moduloActivo === "ventas" ? "activo" : ""}`}
            onClick={() => setModuloActivo("ventas")}
          >
            Historial de Ventas
          </button>

          <div style={{ marginTop: 'auto', borderTop: '1px solid #34495e', paddingTop: '10px' }}>
            <button
              className="admin-nav-btn"
              style={{ color: '#f1c40f', fontWeight: 'bold', width: '100%' }}
              onClick={onIrACaja}
            >
              🍕 Ir a Terminal de Venta
            </button>
          </div>
        </nav>

        <div className="admin-sidebar-footer">
          {/* NUEVO: Botón de configuración de cuenta */}
          <button
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '10px',
              backgroundColor: 'transparent',
              color: '#bdc3c7',
              border: '1px solid #7f8c8d',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            onClick={manejarCambioPin}
          >
            Cambiar mi PIN
          </button>

          <button className="btn-logout-admin" onClick={onCerrarSesion}>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="admin-content">
        {moduloActivo === "productos" && (
          <div>
            <h1>Gestión de Catálogo</h1>
            <ProductosCRUD />
          </div>
        )}

        {moduloActivo === "categorias" && (
          <div>
            <h1>Gestión de Secciones</h1>
            <CategoriasCRUD />
          </div>
        )}

        {moduloActivo === "insumos" && (
          <div>
            <h1>Control de Almacén</h1>
            <GestorInsumos />
          </div>
        )}

        {moduloActivo === "personal" && (
          <div>
            <h1>Recursos Humanos</h1>
            <GestorEmpleados />
          </div>
        )}

        {moduloActivo === "ventas" && (
          <div>
            <h1>Historial de Operaciones</h1>
            <HistorialVentas />
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminPanel;