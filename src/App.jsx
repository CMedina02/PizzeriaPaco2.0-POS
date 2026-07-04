import { useState } from "react";
import Login from "./views/Login";
import Mostrador from "./views/Mostrador";
import CorteCaja from "./views/CorteCaja";
import AdminPanel from "./views/AdminPanel";
import "./App.css";

function App() {
  const [pantallaActual, setPantallaActual] = useState('login');
  // NUEVO: Estado para recordar quién está operando el sistema
  const [rolUsuario, setRolUsuario] = useState(null); 

  function manejarLoginExitoso(rol) {
    setRolUsuario(rol);
    if (rol === 'admin') {
      setPantallaActual('admin');
    } else {
      setPantallaActual('mostrador');
    }
  }

  function manejarCierreSesion() {
    setRolUsuario(null);
    setPantallaActual('login');
  }

  return (
    <>
      {pantallaActual === 'login' && (
        <Login onLoginSuccess={manejarLoginExitoso} />
      )}
      
      {pantallaActual === 'mostrador' && (
        <Mostrador 
          onIrACorte={() => setPantallaActual('corte')} 
          rolUsuario={rolUsuario} 
          onVolverAdmin={() => setPantallaActual('admin')} 
        />
      )}
      
      {pantallaActual === 'corte' && (
        <CorteCaja 
          onVolver={() => setPantallaActual('mostrador')} 
          onTurnoCerrado={manejarCierreSesion} 
        />
      )}

      {pantallaActual === 'admin' && (
        <AdminPanel 
          onCerrarSesion={manejarCierreSesion} 
          onIrACaja={() => setPantallaActual('mostrador')} 
        />
      )}
    </>
  );
}

export default App;