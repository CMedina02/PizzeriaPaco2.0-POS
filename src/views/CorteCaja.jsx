import { useState, useEffect } from "react";
import { obtenerDatosCorte, ejecutarCierreTurno } from "../services/adminService";
import TicketCorte from "../components/TicketCorte";
import "./CorteCaja.css";

function CorteCaja({ onTurnoCerrado, onVolver }) {
  const [datosTurno, setDatosTurno] = useState({
    fondoInicial: 0,
    totalVentas: 0,
    pedidosRealizados: 0,
    esperadoCaja: 0,
    idSesion: null
  });
  const [error, setError] = useState(null);
  const [mostrarTicketZ, setMostrarTicketZ] = useState(false);

  useEffect(() => {
    async function cargarCorte() {
      try {
        const datos = await obtenerDatosCorte();
        setDatosTurno(datos);
      } catch (err) {
        console.error("Error al calcular el corte:", err);
        if (err.message === "NO_HAY_SESION") {
          setError("No hay una sesión de caja abierta para realizar el corte.");
        } else {
          setError("Error interno al obtener los datos de la base de datos.");
        }
      }
    }
    
    cargarCorte();
  }, []);

  async function procesarCierre() {
    if (!datosTurno.idSesion) return;

    try {
      // 1. Ejecutamos el cierre en la base de datos primero para asegurar la integridad
      await ejecutarCierreTurno(datosTurno.idSesion);
      
      // 2. Mostramos el comprobante digital en pantalla
      setMostrarTicketZ(true);
    } catch (err) {
      console.error("Error al cerrar la caja:", err);
      alert("Error al intentar cerrar el turno. Revise la consola.");
    }
  }

  return (
    <div className="corte-layout">
      {/* Superposición del Ticket de Cierre */}
      {mostrarTicketZ && (
        <TicketCorte 
          datos={datosTurno} 
          onFinalizar={onTurnoCerrado} 
        />
      )}

      <header className="corte-header">
        <h2>Auditoría de Caja</h2>
        <p>Arqueo y cierre de turno actual</p>
      </header>

      <div className="corte-panel">
        {error ? (
          <div className="corte-error">
            <p>{error}</p>
            <button className="btn-volver" onClick={onVolver}>Volver al Mostrador</button>
          </div>
        ) : (
          <>
            <div className="corte-grid">
              <div className="corte-card">
                <span>Fondo Fijo Inicial</span>
                <strong>${datosTurno.fondoInicial.toFixed(2)}</strong>
              </div>
              <div className="corte-card">
                <span>Ingreso por Ventas</span>
                <strong>${datosTurno.totalVentas.toFixed(2)}</strong>
              </div>
              <div className="corte-card" style={{ gridColumn: "span 2" }}>
                <span>Tickets Emitidos (Folios procesados)</span>
                <strong>{datosTurno.pedidosRealizados}</strong>
              </div>
            </div>

            <div className="tarjeta-total">
              <span>EFECTIVO ESPERADO EN CAJÓN</span>
              <strong>${datosTurno.esperadoCaja.toFixed(2)}</strong>
            </div>

            <div className="corte-acciones">
              <button className="btn-volver" onClick={onVolver} disabled={mostrarTicketZ}>
                Cancelar y Volver
              </button>
              <button className="btn-cerrar" onClick={procesarCierre} disabled={mostrarTicketZ}>
                Confirmar Cierre
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CorteCaja;