use tauri_plugin_sql::{Builder as SqlBuilder, Migration, MigrationKind};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Lista secuencial de migraciones. El sistema las ejecuta en orden estricto.
    let migraciones = vec![
        // Versión 1: El cimiento que ya ejecutamos
        Migration {
            version: 1,
            description: "crear_tablas_catalogo_base",
            sql: "
                CREATE TABLE IF NOT EXISTS categorias (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS productos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    categoria_id INTEGER,
                    nombre TEXT NOT NULL,
                    precio_base REAL NOT NULL,
                    FOREIGN KEY (categoria_id) REFERENCES categorias (id)
                );
            ",
            kind: MigrationKind::Up,
        },
        // Versión 2: La expansión modular del negocio (Sabores, Inventario, Seguridad y Caja)
        Migration {
            version: 2,
            description: "expansion_sistema_pos",
            sql: "
                -- 1. SOPORTE DE VARIANTES (SABORES)
                -- Mantiene el catálogo limpio. Un producto (ej. Pizza Gde) puede tener múltiples sabores.
                CREATE TABLE IF NOT EXISTS sabores_producto (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    producto_id INTEGER NOT NULL,
                    nombre_sabor TEXT NOT NULL,
                    FOREIGN KEY (producto_id) REFERENCES productos (id) ON DELETE CASCADE
                );

                -- 2. CONTROL DE EMPAQUES (INVENTARIO BÁSICO)
                -- Aquí se almacena el stock físico de contenedores (cajas, vasos, domos).
                CREATE TABLE IF NOT EXISTS inventario_basico (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre_insumo TEXT NOT NULL UNIQUE,
                    stock_actual INTEGER NOT NULL DEFAULT 0
                );

                -- Tabla puente (Receta de Empaques): Relaciona un producto con el empaque que consume.
                CREATE TABLE IF NOT EXISTS receta_empaques (
                    producto_id INTEGER NOT NULL,
                    insumo_id INTEGER NOT NULL,
                    cantidad_a_descontar INTEGER NOT NULL DEFAULT 1,
                    PRIMARY KEY (producto_id, insumo_id),
                    FOREIGN KEY (producto_id) REFERENCES productos (id) ON DELETE CASCADE,
                    FOREIGN KEY (insumo_id) REFERENCES inventario_basico (id) ON DELETE CASCADE
                );

                -- 3. SEGURIDAD Y PERMISOS DE ACCESO
                -- Manejo de usuarios locales mediante PIN numérico y roles.
                CREATE TABLE IF NOT EXISTS usuarios (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre TEXT NOT NULL,
                    pin_acceso TEXT NOT NULL UNIQUE, -- Guardado como TEXT para mantener ceros a la izquierda (ej. '0012')
                    rol TEXT NOT NULL CHECK(rol IN ('admin', 'cajero'))
                );

                -- 4. FLUJO DE CAJA Y TURNOS (SESIONES)
                -- Controla cuándo inicia y termina la jornada, amarrando el fondo fijo.
                CREATE TABLE IF NOT EXISTS sesiones_caja (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    usuario_abrio_id INTEGER NOT NULL,
                    fecha_hora_apertura TEXT NOT NULL, -- Almacenado en formato ISO8601 (YYYY-MM-DD HH:MM:SS)
                    fondo_inicial REAL NOT NULL DEFAULT 500.0,
                    fecha_hora_cierre TEXT, -- Permanecerá NULL hasta que se realice el Corte Z
                    efectivo_real_cierre REAL, -- Lo que la cajera introduce en el corte ciego
                    estado TEXT NOT NULL DEFAULT 'Abierta' CHECK(estado IN ('Abierta', 'Cerrada')),
                    FOREIGN KEY (usuario_abrio_id) REFERENCES usuarios (id)
                );

                -- Registro de mermas, gastos o ingresos manuales de dinero durante el turno.
                CREATE TABLE IF NOT EXISTS movimientos_caja (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sesion_caja_id INTEGER NOT NULL,
                    tipo TEXT NOT NULL CHECK(tipo IN ('Ingreso', 'Baja')),
                    monto REAL NOT NULL,
                    descripcion TEXT NOT NULL,
                    FOREIGN KEY (sesion_caja_id) REFERENCES sesiones_caja (id)
                );

                -- 5. OPERACIÓN Y TICKETS
                -- Cabecera del pedido. Implementa auditoría estricta y Soft Delete.
                CREATE TABLE IF NOT EXISTS pedidos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sesion_caja_id INTEGER NOT NULL,
                    fecha_hora TEXT NOT NULL,
                    total REAL NOT NULL,
                    metodo_pago TEXT NOT NULL CHECK(metodo_pago IN ('Efectivo', 'Tarjeta')),
                    estado_pedido TEXT NOT NULL DEFAULT 'Pagado' CHECK(estado_pedido IN ('Pagado', 'Cancelado')),
                    es_para_entrega INTEGER NOT NULL DEFAULT 0, -- 0 = Falso, 1 = Verdadero (WhatsApp/Repartidor)
                    cliente_nombre TEXT,
                    cliente_direccion TEXT,
                    usuario_autorizo_cancelacion_id INTEGER, -- Guardará el ID del Admin si se cancela por PIN
                    FOREIGN KEY (sesion_caja_id) REFERENCES sesiones_caja (id),
                    FOREIGN KEY (usuario_autorizo_cancelacion_id) REFERENCES usuarios (id)
                );

                -- Detalle del pedido. Soporta la regla crítica de pizzas 'Mitad y Mitad' (sabor1 y sabor2).
                CREATE TABLE IF NOT EXISTS detalle_pedidos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    pedido_id INTEGER NOT NULL,
                    producto_id INTEGER NOT NULL,
                    sabor1_id INTEGER, -- Puede ser NULL si el producto no tiene sabores (ej. Papas fritas)
                    sabor2_id INTEGER, -- Solo se llena si es una pizza dividida mitad y mitad
                    cantidad INTEGER NOT NULL DEFAULT 1,
                    precio_cobrado REAL NOT NULL, -- Registra el precio final cobrado en ese momento exacto
                    FOREIGN KEY (pedido_id) REFERENCES pedidos (id) ON DELETE CASCADE,
                    FOREIGN KEY (producto_id) REFERENCES productos (id),
                    FOREIGN KEY (sabor1_id) REFERENCES sabores_producto (id),
                    FOREIGN KEY (sabor2_id) REFERENCES sabores_producto (id)
                );
            ",
            kind: MigrationKind::Up,
        }
    ];

    tauri::Builder::default()
        .plugin(
            SqlBuilder::default()
                .add_migrations("sqlite:pizzeria.db", migraciones)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error al ejecutar la aplicación tauri");
}
