import { useState } from "react";
import Login from "./views/Login";
import Mostrador from "./views/Mostrador";
import CorteCaja from "./views/CorteCaja";
import AdminPanel from "./views/AdminPanel";
import "./App.css";

function App() {
  const [pantallaActual, setPantallaActual] = useState('login');

  function manejarLoginExitoso(rol) {
    if (rol === 'admin') {
      setPantallaActual('admin');
    } else {
      setPantallaActual('mostrador');
    }
  }

  return (
    <>
      {pantallaActual === 'login' && (
        <Login onLoginSuccess={manejarLoginExitoso} />
      )}
      
      {pantallaActual === 'mostrador' && (
        <Mostrador onIrACorte={() => setPantallaActual('corte')} />
      )}
      
      {pantallaActual === 'corte' && (
        <CorteCaja 
          onVolver={() => setPantallaActual('mostrador')} 
          onTurnoCerrado={() => setPantallaActual('login')} 
        />
      )}

      {pantallaActual === 'admin' && (
        <AdminPanel onCerrarSesion={() => setPantallaActual('login')} />
      )}
    </>
  );
}

export default App;