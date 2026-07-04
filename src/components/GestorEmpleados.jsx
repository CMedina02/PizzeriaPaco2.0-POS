import { useState, useEffect } from "react";
import { obtenerEmpleados, crearEmpleado, eliminarEmpleado } from "../services/adminService";
import "./ProductosCRUD.css";

function GestorEmpleados() {
    const [empleados, setEmpleados] = useState([]);
    const [nuevoNombre, setNuevoNombre] = useState("");
    const [nuevoPin, setNuevoPin] = useState("");

    async function cargarDatos() {
        try {
            const datos = await obtenerEmpleados();
            setEmpleados(datos);
        } catch (error) {
            console.error("Error al cargar empleados:", error);
        }
    }

    useEffect(() => {
        cargarDatos();
    }, []);

    async function manejarCreacion(e) {
        e.preventDefault();
        if (!nuevoNombre.trim() || nuevoPin.length !== 4) {
            alert("Por favor, ingrese un nombre y un PIN exacto de 4 dígitos.");
            return;
        }

        try {
            await crearEmpleado(nuevoNombre, nuevoPin);
            setNuevoNombre("");
            setNuevoPin("");
            cargarDatos();
        } catch (error) {
            if (error.message === "PIN_DUPLICADO") {
                alert("Ese PIN ya está en uso por otro empleado o por el Administrador. Elija uno distinto.");
            } else {
                alert("Error al registrar el empleado.");
            }
        }
    }

    async function manejarEliminacion(id, nombre) {
        if (window.confirm(`¿Está seguro de dar de baja al cajero "${nombre}"? Esta acción no se puede deshacer.`)) {
            try {
                await eliminarEmpleado(id);
                cargarDatos();
            } catch (error) {
                alert("Error al eliminar el registro.");
            }
        }
    }

    return (
        <div className="crud-container">
            <div className="crud-header">
                <h2>Gestión de Personal (Cajeros)</h2>
            </div>

            <form className="crud-formulario" onSubmit={manejarCreacion}>
                <div className="form-grupo">
                    <label>Nombre del Empleado</label>
                    <input
                        type="text"
                        value={nuevoNombre}
                        onChange={(e) => setNuevoNombre(e.target.value)}
                        placeholder="Ej. Juan Pérez"
                        maxLength="50"
                    />
                </div>
                <div className="form-grupo">
                    <label>PIN de Acceso (4 dígitos)</label>
                    <input
                        type="text"
                        value={nuevoPin}
                        onChange={(e) => setNuevoPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="Ej. 1234"
                        maxLength="4"
                    />
                </div>
                <div className="form-grupo form-acciones">
                    <button type="submit" className="btn-guardar" disabled={!nuevoNombre || nuevoPin.length !== 4}>
                        + Alta de Cajero
                    </button>
                </div>
            </form>

            <table className="crud-tabla">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>PIN Registrado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {empleados.map((emp) => (
                        <tr key={emp.id}>
                            <td>{emp.id}</td>
                            <td><strong>{emp.nombre}</strong></td>
                            <td>
                                <span style={{ letterSpacing: '2px', fontFamily: 'monospace', fontSize: '1.1rem' }}>
                                    {emp.pin_acceso}
                                </span>
                            </td>
                            <td className="acciones-celda">
                                <button
                                    className="btn-eliminar"
                                    onClick={() => manejarEliminacion(emp.id, emp.nombre)}
                                >
                                    Dar de Baja
                                </button>
                            </td>
                        </tr>
                    ))}
                    {empleados.length === 0 && (
                        <tr>
                            <td colSpan="4" style={{ textAlign: "center", padding: "20px" }}>No hay cajeros registrados.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default GestorEmpleados;