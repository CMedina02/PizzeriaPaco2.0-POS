import { useState, useEffect } from "react";
import { obtenerHistorialVentas } from "../services/adminService";
import "./ProductosCRUD.css"; // Reutilizamos los estilos de tabla existentes

function HistorialVentas() {
  const [ventas, setVentas] = useState([]);

  useEffect(() => {
    async function cargarVentas() {
      try {
        const historial = await obtenerHistorialVentas();
        setVentas(historial);
      } catch (error) {
        console.error("Error al cargar el historial de ventas:", error);
      }
    }
    cargarVentas();
  }, []);

  return (
    <div className="crud-container">
      <div className="crud-header">
        <h2>Auditoría de Tickets (Últimos 100)</h2>
      </div>

      <table className="crud-tabla">
        <thead>
          <tr>
            <th>Folio de Ticket</th>
            <th>Fecha y Hora</th>
            <th>Monto Cobrado</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {ventas.map((venta) => (
            <tr key={venta.folio}>
              <td><strong>#{venta.folio.toString().padStart(5, '0')}</strong></td>
              <td>{new Date(venta.fecha_hora).toLocaleString("es-MX")}</td>
              <td>${venta.total.toFixed(2)}</td>
              <td>
                {/* Aquí mostramos el estado REAL de la base de datos */}
                <span style={{ 
                  color: venta.estado === 'Pagado' ? "#27ae60" : "#e67e22", 
                  fontWeight: "bold" 
                }}>
                  {venta.estado || "SIN ESTADO"}
                </span>
              </td>
            </tr>
          ))}
          {ventas.length === 0 && (
            <tr>
              <td colSpan="4" style={{ textAlign: "center", padding: "20px" }}>
                No hay ventas registradas en el sistema.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default HistorialVentas;