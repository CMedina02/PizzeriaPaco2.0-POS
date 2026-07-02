import { useState } from "react";
import "./AdminPanel.css";
import ProductosCRUD from "../components/ProductosCRUD";
import CategoriasCRUD from "../components/CategoriasCRUD";
import HistorialVentas from "../components/HistorialVentas";

function AdminPanel({ onCerrarSesion }) {
  const [moduloActivo, setModuloActivo] = useState("productos");

  return (
    <div className="admin-layout">
      {/* Barra Lateral de Navegación */}
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
            className={`admin-nav-btn ${moduloActivo === "ventas" ? "activo" : ""}`}
            onClick={() => setModuloActivo("ventas")}
          >
            Historial de Ventas
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          <button className="btn-logout-admin" onClick={onCerrarSesion}>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Área Principal de Trabajo */}
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