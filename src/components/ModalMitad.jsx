import { useState } from "react";
import "./ModalMitad.css";

function ModalMitad({ pizzaInicial, productosDisponibles, onConfirmar, onCancelar }) {
  const [modo, setModo] = useState('completa');
  const [sabor2, setSabor2] = useState(null);

  const pizzasDisponibles = productosDisponibles.filter(
    p => p.categoria_id === pizzaInicial.categoria_id && p.id !== pizzaInicial.id
  );

  function manejarConfirmacion() {
    if (modo === 'completa') {
      onConfirmar({
        ...pizzaInicial,
        producto_id: pizzaInicial.id,
        sabor1_id: pizzaInicial.id,
        sabor2_id: null
      });
    } else {
      const precioMitad = (pizzaInicial.precio_base + sabor2.precio_base) / 2;
      
      onConfirmar({
        id: `mitad-${pizzaInicial.id}-${sabor2.id}-${Date.now()}`,
        nombre: `½ ${pizzaInicial.nombre} / ½ ${sabor2.nombre}`,
        precio_base: precioMitad,
        producto_id: pizzaInicial.id,
        sabor1_id: pizzaInicial.id,
        sabor2_id: sabor2.id
      });
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="modal-title">Personalizar: {pizzaInicial.nombre}</h3>
        
        <div className="opciones-tipo">
          <button 
            className={`btn-tipo ${modo === 'completa' ? 'activo' : ''}`}
            onClick={() => setModo('completa')}
          >
            Pizza Completa
          </button>
          <button 
            className={`btn-tipo ${modo === 'mitad' ? 'activo' : ''}`}
            onClick={() => setModo('mitad')}
          >
            Mitad y Mitad
          </button>
        </div>

        {modo === 'mitad' && (
          <div className="selector-sabores">
            <h4 style={{ margin: "0 0 10px 0", color: "#34495e" }}>Selecciona la segunda mitad:</h4>
            <div className="sabor-grid">
              {pizzasDisponibles.map(pizza => (
                <button
                  key={pizza.id}
                  className={`btn-sabor ${sabor2?.id === pizza.id ? 'seleccionado' : ''}`}
                  onClick={() => setSabor2(pizza)}
                >
                  {pizza.nombre}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn-cancelar" onClick={onCancelar}>Cancelar</button>
          <button 
            className="btn-confirmar" 
            disabled={modo === 'mitad' && !sabor2}
            onClick={manejarConfirmacion}
          >
            Confirmar y Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalMitad;