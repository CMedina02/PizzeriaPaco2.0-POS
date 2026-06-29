import { useState } from "react";
import "./TicketModal.css";

function TicketModal({ folio, comanda, total, onCerrar }) {
  const [efectivoRecibido, setEfectivoRecibido] = useState("");
  
  const fecha = new Date().toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const pago = parseFloat(efectivoRecibido) || 0;
  const cambio = pago - total;
  const pagoSuficiente = pago >= total;

  return (
    <div className="modal-overlay">
      <div className="ticket-wrapper">
        <div className="ticket-papel">
          <header className="ticket-header">
            <h2 className="ticket-logo">PIZZERÍA POS</h2>
            <p>Comprobante de Venta</p>
            <p>========================</p>
            <p>Folio: #{folio.toString().padStart(5, '0')}</p>
            <p>Fecha: {fecha}</p>
            <p>========================</p>
          </header>

          <div className="ticket-body">
            <table className="ticket-tabla">
              <thead>
                <tr>
                  <th className="col-cant">CANT</th>
                  <th className="col-desc">DESCRIPCIÓN</th>
                  <th className="col-imp">IMPORTE</th>
                </tr>
              </thead>
              <tbody>
                {comanda.map((item, index) => (
                  <tr key={index}>
                    <td className="col-cant">1</td>
                    <td className="col-desc">{item.nombre}</td>
                    <td className="col-imp">${item.precio_base.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ticket-footer">
            <p>========================</p>
            <div className="fila-total-ticket">
              <span>TOTAL A PAGAR:</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <p>========================</p>
            <p className="mensaje-despedida">¡Gracias por su preferencia!</p>
          </div>
        </div>
        
        <div className="panel-cobro">
          <div className="input-cobro-grupo">
            <label>Efectivo Recibido ($):</label>
            <input 
              type="number" 
              className="input-efectivo"
              autoFocus
              value={efectivoRecibido}
              onChange={(e) => setEfectivoRecibido(e.target.value)}
              placeholder="Ej. 200"
            />
          </div>
          
          <div className={`display-cambio ${pagoSuficiente ? 'valido' : 'invalido'}`}>
            <span>Cambio a entregar:</span>
            <strong>${pagoSuficiente ? cambio.toFixed(2) : "0.00"}</strong>
          </div>

          <button 
            className="btn-finalizar" 
            onClick={onCerrar}
            disabled={!pagoSuficiente}
          >
            Entregar Cambio y Finalizar
          </button>
        </div>
      </div>
    </div>
  );
}

export default TicketModal;