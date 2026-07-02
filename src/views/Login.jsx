import { useState, useEffect } from "react";
import { procesarAperturaCaja, asegurarUsuarioDefault } from "../services/authService";
import "./Login.css";

function Login({ onLoginSuccess }) {
  const [pin, setPin] = useState("");
  const [fondo, setFondo] = useState("500.00");
  const [error, setError] = useState("");

 // Este disparador corrige la base de datos apenas abre la pantalla de Login
  useEffect(() => {
    async function prepararSistema() {
      try {
        await asegurarUsuarioDefault();
      } catch (error) {
        console.error("Fallo al sincronizar base de datos", error);
      }
    }
    prepararSistema();
  }, []);

  function agregarNumero(num) {
    if (pin.length < 4) setPin(pin + num);
    setError("");
  }

  function borrarTodo() {
    setPin("");
    setError("");
  }

  function borrarUltimo() {
    setPin(pin.slice(0, -1));
    setError("");
  }

  async function iniciarTurno() {
    if (pin.length < 4) {
      setError("El PIN debe tener 4 dígitos");
      return;
    }

    try {
      const resultado = await procesarAperturaCaja(pin, fondo);
      
      if (resultado.operacion === "REANUDACION") {
        alert(`Turno Previo Recuperado.\nExiste una sesión abierta en el sistema. El nuevo monto fue descartado para operar con el fondo original de $${resultado.fondoReal.toFixed(2)}.`);
      }

      // Inyectamos el rol en la función de éxito
      onLoginSuccess(resultado.rol);  
    } catch (err) {
      if (err.message === "PIN_INCORRECTO") {
        setError("PIN incorrecto. Intente de nuevo.");
        setPin("");
      } else if (err.message === "MULTIPLES_SESIONES") {
        setError("ERROR CRÍTICO: Múltiples sesiones abiertas detectadas. Contacte a soporte.");
        setPin("");
      } else {
        console.error("Error transaccional en login:", err);
        setError("Error interno al conectar con la base de datos.");
      }
    }
  }

  // Integración del teclado físico del equipo
  useEffect(() => {
    function manejarTecladoFisico(event) {
      // Evitar que la escritura en el campo de "Fondo Fijo" altere el PIN
      if (document.activeElement.tagName === "INPUT") return;

      if (event.key >= "0" && event.key <= "9") {
        agregarNumero(event.key);
      } else if (event.key === "Backspace") {
        borrarUltimo();
      } else if (event.key === "Escape" || event.key === "Delete" || event.key.toLowerCase() === "c") {
        borrarTodo();
      } else if (event.key === "Enter") {
        iniciarTurno();
      }
    }

    window.addEventListener("keydown", manejarTecladoFisico);
    
    // Función de limpieza indispensable para evitar fugas de memoria al cambiar de pantalla
    return () => {
      window.removeEventListener("keydown", manejarTecladoFisico);
    };
  }, [pin, fondo]); // Dependencias obligatorias para capturar el estado actualizado

  return (
    <div className="login-layout">
      <div className="login-card">
        <h2 className="login-title">Apertura de Caja</h2>
        <p className="login-subtitle">Ingresa tu PIN para iniciar turno</p>
        
        <div className="pin-display">
          {pin.padEnd(4, '•').split('').map((char, i) => (
            <span key={i} className={`pin-dot ${char === '•' ? 'vacio' : ''}`}>
              {char}
            </span>
          ))}
        </div>

        {error && <p className="error-msg">{error}</p>}

        <div className="fondo-container">
          <label className="fondo-label">Fondo Fijo Inicial ($):</label>
          <input 
            type="number" 
            className="input-fondo"
            value={fondo}
            onChange={(e) => setFondo(e.target.value)}
          />
        </div>

        <div className="numpad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button key={num} className="btn-num" onClick={() => agregarNumero(num.toString())}>{num}</button>
          ))}
          <button className="btn-num btn-borrar" onClick={borrarTodo}>C</button>
          <button className="btn-num" onClick={() => agregarNumero("0")}>0</button>
          <button className="btn-num btn-ingresar" onClick={iniciarTurno}>OK</button>
        </div>
      </div>
    </div>
  );
}

export default Login;