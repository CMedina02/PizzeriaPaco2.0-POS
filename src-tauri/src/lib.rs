use tauri_plugin_sql::{Builder as SqlBuilder, Migration, MigrationKind};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Definimos nuestras Migraciones (El esquema de la base de datos)
    let migraciones = vec![Migration {
        version: 1,
        description: "crear_tablas_catalogo",
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
    }];

    // Ensamblamos la aplicación y activamos el plugin SQL
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
