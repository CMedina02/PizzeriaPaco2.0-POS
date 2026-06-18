import { useState } from "react";
import Login from "./views/Login";
import Mostrador from "./views/Mostrador";
import "./App.css";

function App() {
  // Estado que controla qué pantalla estamos viendo. (Falso = No ha puesto su PIN)
  const [accesoConcedido, setAccesoConcedido] = useState(false);

  return (
    <>
      {accesoConcedido === false ? (
        <Login onLoginSuccess={() => setAccesoConcedido(true)} />
      ) : (
        <Mostrador />
      )}
    </>
  );
}

export default App;