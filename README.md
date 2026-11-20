# Pizzeria Paco POS

Aplicación de escritorio para registrar ventas de una pizzería y administrar su catálogo, personal, inventario básico y turnos de caja. La interfaz está construida con React y la aplicación nativa con Tauri; los datos se guardan localmente en SQLite.

## Tecnologías

- React 19 y Vite 7
- Tauri 2 y Rust
- SQLite mediante `@tauri-apps/plugin-sql`
- Node.js para desarrollo, pruebas y compilación del frontend

## Funcionalidades implementadas

- Acceso de administradores y cajeros con PIN de cuatro dígitos.
- Apertura y reanudación de una sesión de caja, y cierre con resumen de ventas.
- Registro de pedidos pagados en efectivo, cálculo del total y emisión de ticket.
- Selección de sabores para pizzas mitad y mitad.
- Administración de categorías, productos, personal e insumos.
- Descuento de masas y cajas al registrar ventas de pizzas.
- Historial de hasta 100 ventas recientes.

## Requisitos

- Node.js 22.12 o posterior y npm.
- Rust 1.90 o posterior y Cargo.
- Herramientas nativas que Tauri requiere para tu sistema operativo. Consulta la [guía oficial de prerrequisitos de Tauri](https://v2.tauri.app/start/prerequisites/).

## Instalación y ejecución

Desde la raíz del repositorio:

```bash
npm ci
npm run tauri -- dev
```

Para compilar el frontend y la aplicación de escritorio:

```bash
npm run build
npm run tauri -- build
```

La base `pizzeria.db` se crea en el directorio de datos de la aplicación y Tauri aplica las migraciones registradas en `src-tauri/src/lib.rs`. En una base sin usuarios, al abrir la pantalla de acceso se solicita crear la primera cuenta administradora con un PIN elegido por el responsable. No se crean cuentas con PIN predeterminado.

Las instalaciones existentes conservan sus usuarios y PIN. Los PIN antiguos en texto se convierten a PBKDF2 con sal cuando esa cuenta inicia sesión correctamente; el valor que el usuario debe ingresar no cambia durante esa conversión. Los PIN nuevos y los cambios de PIN rechazan `1234` y `9999`. Un administrador puede cambiar el suyo o el de un cajero desde la gestión de personal.

## Pruebas

```bash
npm test
```

Las pruebas crean SQLite temporales en el directorio temporal del sistema y eliminan esos directorios al terminar. No abren la base de datos de la aplicación.

## Estructura principal

```text
src/
  components/       Interfaz de catálogo, personal, tickets e inventario
  services/         Acceso SQLite, autenticación, PIN y operaciones POS
  views/             Pantallas de acceso, mostrador, caja y administración
src-tauri/
  src/lib.rs         Migraciones SQLite e inicialización Tauri
  capabilities/      Permisos de la ventana principal
  tauri.conf.json    Configuración y política CSP
tests/               Pruebas con SQLite temporal
```

## Seguridad y limitaciones

- Los PIN nuevos se guardan como hashes PBKDF2 con sal. Los PIN de cuatro dígitos tienen un espacio de búsqueda pequeño; usa el sistema en un equipo de confianza y evita compartir la base de datos.
- Los PIN predeterminados existentes no se cambian ni eliminan automáticamente para conservar el acceso. Si una cuenta heredada aún usa `1234` o `9999`, su usuario o el administrador debe cambiarlo explícitamente.
- Si una base existente tiene usuarios pero ningún administrador, el arranque conserva las cuentas y no crea un administrador automáticamente. La operación de caja sigue disponible para los cajeros; la recuperación de funciones gerenciales requiere una decisión del responsable de esa base.
- Los roles separan las pantallas de administración y operación dentro de la aplicación local. El sistema no implementa cuentas remotas ni autorización en un servidor.
- Actualmente los cobros se registran como efectivo; no hay integración de pagos con tarjeta, sincronización entre sucursales ni copias de seguridad automáticas.
