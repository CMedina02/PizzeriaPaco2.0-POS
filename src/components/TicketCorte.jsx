import "./TicketCorte.css";

function TicketCorte({ datos, onFinalizar }) {
  const fechaCierre = new Date().toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="modal-overlay-corte">
      <div className="ticket-corte-papel">
        <header className="ticket-header">
          <h2 className="ticket-logo">PIZZERÍA POS</h2>
          <p>*** CORTE DE CAJA (Z) ***</p>
          <p>========================</p>
          <p>Sesión ID: #{datos.idSesion}</p>
          <p>Fecha Cierre: {fechaCierre}</p>
          <p>========================</p>
        </header>

        <div className="ticket-body-corte">
          <div className="fila-corte">
            <span>Fondo Fijo Inicial:</span>
            <span>${datos.fondoInicial.toFixed(2)}</span>
          </div>
          <div className="fila-corte">
            <span>Ingreso por Ventas:</span>
            <span>${datos.totalVentas.toFixed(2)}</span>
          </div>
          <div className="fila-corte">
            <span>Tickets Emitidos:</span>
            <span>{datos.pedidosRealizados}</span>
          </div>
        </div>

        <div className="ticket-footer-corte">
          <p>========================</p>
          <div className="fila-total-corte">
            <span>TOTAL EN CAJÓN:</span>
            <span>${datos.esperadoCaja.toFixed(2)}</span>
          </div>
          <p>========================</p>
          <p className="firma-espacio">________________________</p>
          <p className="firma-texto">Firma del Cajero</p>
        </div>
      </div>
      
      <button className="btn-bloquear-sistema" onClick={onFinalizar}>
        Aceptar y Bloquear Sistema
      </button>
    </div>
  );
}

export default TicketCorte;