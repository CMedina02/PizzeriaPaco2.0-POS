import { useState, useEffect } from "react";
import { obtenerDatosCorte, ejecutarCierreTurno } from "../services/adminService";

function CorteCaja({ onTurnoCerrado, onVolver }) {
  const [datosTurno, setDatosTurno] = useState({
    fondoInicial: 0,
    totalVentas: 0,
    pedidosRealizados: 0,
    esperadoCaja: 0,
    idSesion: null
  });
  const [error, setError] = useState(null);

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
      await ejecutarCierreTurno(datosTurno.idSesion);
      alert("Turno cerrado correctamente.\nEl sistema se bloqueará hasta el siguiente turno.");
      onTurnoCerrado(); 
    } catch (err) {
      console.error("Error al cerrar la caja:", err);
      alert("Error al intentar cerrar el turno.");
    }
  }

  return (
    <div>
      <h2>Corte de Caja</h2>
      {error ? (
        <div style={{ color: "red", margin: "20px 0" }}>
          <p>{error}</p>
          <button onClick={onVolver}>Volver al Mostrador</button>
        </div>
      ) : (
        <>
          <p>Revise que el efectivo físico coincida con el esperado en el sistema.</p>

          <div style={{ margin: "20px 0", border: "1px solid black", padding: "15px" }}>
            <p><strong>Fondo Fijo Inicial:</strong> ${datosTurno.fondoInicial.toFixed(2)}</p>
            <p><strong>Total de Ventas:</strong> ${datosTurno.totalVentas.toFixed(2)}</p>
            <p><strong>Tickets Emitidos:</strong> {datosTurno.pedidosRealizados}</p>
            <hr />
            <h3><strong>Efectivo Esperado en Cajón:</strong> ${datosTurno.esperadoCaja.toFixed(2)}</h3>
          </div>

          <div>
            <button onClick={onVolver} style={{ marginRight: "10px" }}>Volver al Mostrador</button>
            <button onClick={procesarCierre}>Confirmar Cierre de Turno</button>
          </div>
        </>
      )}
    </div>
  );
}

export default CorteCaja;