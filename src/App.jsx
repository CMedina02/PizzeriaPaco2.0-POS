import { useState } from "react";
import Login from "./views/Login";
import Mostrador from "./views/Mostrador";
import CorteCaja from "./views/CorteCaja";
import AdminPanel from "./views/AdminPanel";
import "./App.css";

function App() {
  const [pantallaActual, setPantallaActual] = useState('login');
  const [usuarioActual, setUsuarioActual] = useState(null);

  function manejarLoginExitoso(usuario) {
    setUsuarioActual(usuario);
    if (usuario.rol === 'admin') {
      setPantallaActual('admin');
    } else {
      setPantallaActual('mostrador');
    }
  }

  function manejarCierreSesion() {
    setUsuarioActual(null);
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
          rolUsuario={usuarioActual?.rol}
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
          usuarioId={usuarioActual?.id}
        />
      )}
    </>
  );
}

export default App;
