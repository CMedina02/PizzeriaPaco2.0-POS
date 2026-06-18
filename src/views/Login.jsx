import { useState, useEffect } from "react";
import Database from "@tauri-apps/plugin-sql";
import "./Login.css";

function Login({ onLoginSuccess }) {
  const [pin, setPin] = useState("");
  const [fondo, setFondo] = useState("500.00");
  const [error, setError] = useState("");

  // Truco de laboratorio: Asegurarnos de que exista el cajero '1234'
  useEffect(() => {
    async function asegurarUsuario() {
      try {
        const db = await Database.load("sqlite:pizzeria.db");
        const userCount = await db.select("SELECT COUNT(*) as total FROM usuarios");
        if (userCount[0].total === 0) {
          await db.execute("INSERT INTO usuarios (nombre, pin_acceso, rol) VALUES ('Cajero Turno 1', '1234', 'cajero')");
        }
      } catch (e) {
        console.error("Error al preparar usuario:", e);
      }
    }
    asegurarUsuario();
  }, []);

  function agregarNumero(num) {
    if (pin.length < 4) setPin(pin + num);
    setError("");
  }

  function borrarPin() {
    setPin("");
    setError("");
  }

  async function iniciarTurno() {
    if (pin.length < 4) {
      setError("El PIN debe tener 4 dígitos");
      return;
    }

    try {
      const db = await Database.load("sqlite:pizzeria.db");
      
      // 1. Validar el PIN en la tabla usuarios
      const usuarios = await db.select("SELECT * FROM usuarios WHERE pin_acceso = $1", [pin]);
      
      if (usuarios.length === 0) {
        setError("PIN incorrecto. Intenta de nuevo.");
        setPin("");
        return;
      }

      const usuario = usuarios[0];

      // 2. Revisar si ya había una caja abierta (por si se cerró la app por accidente)
      const sesionAbierta = await db.select("SELECT * FROM sesiones_caja WHERE estado = 'Abierta' LIMIT 1");

      if (sesionAbierta.length === 0) {
        // 3. Abrir la caja oficialmente
        const fechaApertura = new Date().toISOString();
        await db.execute(
          "INSERT INTO sesiones_caja (usuario_abrio_id, fecha_hora_apertura, fondo_inicial, estado) VALUES ($1, $2, $3, 'Abierta')",
          [usuario.id, fechaApertura, parseFloat(fondo)]
        );
      }

      // 4. ¡Éxito! Le decimos a la app que cambie de pantalla
      onLoginSuccess();

    } catch (error) {
      console.error("Error en login:", error);
      setError("Error interno al conectar con la base de datos.");
    }
  }

  return (
    <div className="login-layout">
      <div className="login-card">
        <h2 className="login-title">Apertura de Caja</h2>
        <p className="login-subtitle">Ingresa tu PIN para iniciar turno</p>
        
        {/* Pantalla del PIN oculto */}
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

        {/* Teclado Táctil */}
        <div className="numpad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button key={num} className="btn-num" onClick={() => agregarNumero(num.toString())}>{num}</button>
          ))}
          <button className="btn-num btn-borrar" onClick={borrarPin}>C</button>
          <button className="btn-num" onClick={() => agregarNumero("0")}>0</button>
          <button className="btn-num btn-ingresar" onClick={iniciarTurno}>OK</button>
        </div>
      </div>
    </div>
  );
}

export default Login;