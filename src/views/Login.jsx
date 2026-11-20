import { useState, useEffect } from "react";
import { procesarAperturaCaja, asegurarUsuarioDefault, crearAdministradorInicial } from "../services/authService";
import "./Login.css";

function Login({ onLoginSuccess }) {
  const [pin, setPin] = useState("");
  const [fondo, setFondo] = useState("500.00");
  const [error, setError] = useState("");
  const [preparado, setPreparado] = useState(false);
  const [requiereAdminInicial, setRequiereAdminInicial] = useState(false);
  const [sinAdministrador, setSinAdministrador] = useState(false);
  const [nombreAdmin, setNombreAdmin] = useState("");
  const [pinAdmin, setPinAdmin] = useState("");

 // Este disparador corrige la base de datos apenas abre la pantalla de Login
  useEffect(() => {
    async function prepararSistema() {
      try {
        const estadoUsuarios = await asegurarUsuarioDefault();
        setRequiereAdminInicial(estadoUsuarios.requiereConfiguracionInicial);
        setSinAdministrador(estadoUsuarios.sinAdministrador);
      } catch (error) {
        console.error("Fallo al sincronizar base de datos", error);
        setError("No se pudo preparar la base de datos.");
      } finally {
        setPreparado(true);
      }
    }
    prepararSistema();
  }, []);

  function agregarNumero(num) {
    if (pin.length < 4) setPin(pin + num);
    setError("");
  }

  async function configurarAdministrador(e) {
    e.preventDefault();
    if (!nombreAdmin.trim() || pinAdmin.length !== 4) {
      setError("Ingresa un nombre y un PIN de cuatro dígitos.");
      return;
    }
    try {
      await crearAdministradorInicial(nombreAdmin, pinAdmin);
      setRequiereAdminInicial(false);
      setPin(pinAdmin);
      setNombreAdmin("");
      setPinAdmin("");
      setError("");
      alert("Cuenta administradora configurada. Presiona OK para iniciar el turno.");
    } catch (err) {
      if (err.message === "PIN_PREDETERMINADO") {
        setError("Elige un PIN distinto de 1234 y 9999.");
      } else if (err.message === "USUARIOS_EXISTENTES") {
        setError("Ya hay usuarios configurados. Actualiza la pantalla e inicia sesión.");
      } else {
        setError("No se pudo crear la cuenta administradora.");
      }
    }
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
      if (resultado.pinPredeterminado) {
        const aviso = resultado.rol === "admin"
          ? "Este usuario conserva un PIN predeterminado conocido. Cámbielo desde su panel gerencial."
          : "Este usuario conserva un PIN predeterminado conocido. Solicita al administrador que lo cambie.";
        alert(aviso);
      }

      // Inyectamos el rol en la función de éxito
      onLoginSuccess({ id: resultado.usuarioId, rol: resultado.rol });
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
        {!preparado ? (
          <p className="login-subtitle">Preparando la base de datos...</p>
        ) : requiereAdminInicial ? (
          <>
            <h2 className="login-title">Configuración inicial</h2>
            <p className="login-subtitle">Crea la primera cuenta administradora. Elige un PIN propio de cuatro dígitos.</p>
            {error && <p className="error-msg">{error}</p>}
            <form onSubmit={configurarAdministrador}>
              <div className="fondo-container">
                <label className="fondo-label">Nombre</label>
                <input
                  className="input-fondo"
                  value={nombreAdmin}
                  onChange={(e) => setNombreAdmin(e.target.value.slice(0, 50))}
                  maxLength={50}
                  required
                />
                <label className="fondo-label">PIN de cuatro dígitos (no 1234 ni 9999)</label>
                <input
                  className="input-fondo"
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  value={pinAdmin}
                  onChange={(e) => setPinAdmin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  maxLength={4}
                  required
                />
              </div>
              <button className="btn-num btn-ingresar" type="submit">Crear administrador</button>
            </form>
          </>
        ) : (
        <>
        <h2 className="login-title">Apertura de Caja</h2>
        <p className="login-subtitle">Ingresa tu PIN para iniciar turno</p>
        {sinAdministrador && (
          <p className="error-msg">No hay administrador configurado. El acceso de cajero sigue disponible; la recuperación gerencial requiere al responsable de la base.</p>
        )}
        
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
        </>
        )}
      </div>
    </div>
  );
}

export default Login;
