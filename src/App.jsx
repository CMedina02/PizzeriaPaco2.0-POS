import { useState, useEffect } from "react";
import Database from "@tauri-apps/plugin-sql";
import "./App.css";

function App() {
  const [categorias, setCategorias] = useState([]);

  async function cargarCategorias() {
    try {
      const db = await Database.load("sqlite:pizzeria.db");
      const resultado = await db.select("SELECT * FROM categorias");
      setCategorias(resultado);
    } catch (error) {
      console.error("Error al leer la base de datos:", error);
    }
  }

  async function agregarCategoriaPrueba() {
    try {
      const db = await Database.load("sqlite:pizzeria.db");
      await db.execute("INSERT INTO categorias (nombre) VALUES ($1)", [
        "Pizzas Clásicas",
      ]);
      cargarCategorias();
    } catch (error) {
      console.error("Error al insertar:", error);
    }
  }

  useEffect(() => {
    cargarCategorias();
  }, []);

  return (
    <main className="container">
      <h1 className="titulo-pos">Pizzería POS</h1>
      <p className="subtitulo">Prueba de conexión con SQLite</p>
      
      <button className="btn-primario" onClick={agregarCategoriaPrueba}>
        Agregar Categoría de Prueba
      </button>

      <div className="panel-resultados">
        <h3>Categorías en la Base de Datos:</h3>
        <ul className="lista-categorias">
          {categorias.length === 0 ? (
            <li>No hay categorías aún...</li>
          ) : (
            categorias.map((cat) => (
              <li key={cat.id}>
                ID {cat.id}: <strong>{cat.nombre}</strong>
              </li>
            ))
          )}
        </ul>
      </div>
    </main>
  );
}

export default App;