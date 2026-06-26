import { useState } from "react";
import Login from "./views/Login";
import Mostrador from "./views/Mostrador";
import CorteCaja from "./views/CorteCaja";
import "./App.css";

function App() {
  // Ahora manejamos 3 estados posibles de pantalla
  const [pantallaActual, setPantallaActual] = useState('login');

  return (
    <>
      {pantallaActual === 'login' && (
        <Login onLoginSuccess={() => setPantallaActual('mostrador')} />
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
    </>
  );
}

export default App;