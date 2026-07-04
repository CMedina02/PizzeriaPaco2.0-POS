import { useState, useEffect } from "react";
import { obtenerInsumos, agregarStockInsumo } from "../services/adminService";
import "./ProductosCRUD.css";

function GestorInsumos() {
    const [insumos, setInsumos] = useState([]);

    async function cargarDatos() {
        try {
            const datos = await obtenerInsumos();
            setInsumos(datos);
        } catch (error) {
            console.error("Error al cargar insumos:", error);
        }
    }

    useEffect(() => {
        cargarDatos();
    }, []);

    async function manejarIngresoStock(id, nombre) {
        const cantidadStr = window.prompt(`Ingreso de Almacén\n\n¿Cuántas unidades de "${nombre}" acaban de llegar del proveedor?`);

        if (!cantidadStr) return; // Si el usuario cancela

        const cantidad = parseInt(cantidadStr);
        if (isNaN(cantidad) || cantidad <= 0) {
            alert("Operación cancelada: Ingrese un número entero válido mayor a 0.");
            return;
        }

        try {
            await agregarStockInsumo(id, cantidad);
            cargarDatos();
        } catch (error) {
            console.error("Error al actualizar stock:", error);
            alert("Error de base de datos al actualizar el inventario.");
        }
    }

    return (
        <div className="crud-container">
            <div className="crud-header">
                <h2>Control de Insumos Críticos</h2>
            </div>

            <table className="crud-tabla">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre del Insumo</th>
                        <th>Stock Actual (Unidades)</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {insumos.map((insumo) => (
                        <tr key={insumo.id}>
                            <td>{insumo.id}</td>
                            <td><strong>{insumo.nombre}</strong></td>
                            <td>
                                <span style={{
                                    color: insumo.stock < 0 ? '#e74c3c' : (insumo.stock < 20 ? '#f39c12' : '#27ae60'),
                                    fontWeight: 'bold',
                                    fontSize: '1.1rem'
                                }}>
                                    {insumo.stock}
                                </span>
                            </td>
                            <td className="acciones-celda">
                                <button
                                    className="btn-guardar"
                                    onClick={() => manejarIngresoStock(insumo.id, insumo.nombre)}
                                >
                                    + Ingresar Compra
                                </button>
                            </td>
                        </tr>
                    ))}
                    {insumos.length === 0 && (
                        <tr>
                            <td colSpan="4" style={{ textAlign: "center", padding: "20px" }}>No hay insumos registrados.</td>
                        </tr>
                    )}
                </tbody>
            </table>

            <p style={{ marginTop: '20px', color: '#7f8c8d', fontSize: '0.9rem' }}>
                * Nota: El stock se descuenta automáticamente al cobrar una pizza. Si el número es negativo, indica que se vendió producto sin haber registrado previamente la factura de compra en el sistema.
            </p>
        </div>
    );
}

export default GestorInsumos;