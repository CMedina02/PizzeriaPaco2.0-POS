import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  asegurarUsuarioDefault,
  crearAdministradorInicial,
  procesarAperturaCaja,
} from "../src/services/authService.js";
import {
  actualizarPinAdmin,
  actualizarPinEmpleado,
  crearEmpleado,
  eliminarEmpleado,
  obtenerEmpleados,
} from "../src/services/adminService.js";

const bases = new Set();

class ConexionSQLiteTemporal {
  constructor() {
    this.directorio = mkdtempSync(join(tmpdir(), "pizzeria-pos-test-"));
    this.archivo = join(this.directorio, "prueba.sqlite");
    this.db = new DatabaseSync(this.archivo);
    this.db.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        pin_acceso TEXT NOT NULL UNIQUE,
        rol TEXT NOT NULL CHECK(rol IN ('admin', 'cajero'))
      );
      CREATE TABLE sesiones_caja (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_abrio_id INTEGER NOT NULL,
        fecha_hora_apertura TEXT NOT NULL,
        fondo_inicial REAL NOT NULL DEFAULT 500,
        fecha_hora_cierre TEXT,
        estado TEXT NOT NULL DEFAULT 'Abierta' CHECK(estado IN ('Abierta', 'Cerrada')),
        FOREIGN KEY (usuario_abrio_id) REFERENCES usuarios(id)
      );
    `);
    bases.add(this);
  }

  select(sql, params = []) {
    return this.db.prepare(sql.replace(/\$\d+/g, "?")).all(...params).map((row) => ({ ...row }));
  }

  execute(sql, params = []) {
    const statement = sql.replace(/\$\d+/g, "?");
    if (params.length === 0) return this.db.exec(statement);
    return this.db.prepare(statement).run(...params);
  }

  cerrar() {
    this.db.close();
    rmSync(this.directorio, { recursive: true, force: true });
    bases.delete(this);
  }
}

afterEach(() => {
  for (const base of bases) base.cerrar();
});

test("el arranque conserva usuarios existentes y no siembra PIN predeterminados", async () => {
  const db = new ConexionSQLiteTemporal();
  db.execute("INSERT INTO usuarios (nombre, pin_acceso, rol) VALUES ($1, $2, $3)", ["Admin A", "9999", "admin"]);
  db.execute("INSERT INTO usuarios (nombre, pin_acceso, rol) VALUES ($1, $2, $3)", ["Admin B", "2580", "admin"]);
  db.execute("INSERT INTO usuarios (nombre, pin_acceso, rol) VALUES ($1, $2, $3)", ["Caja", "1234", "cajero"]);
  db.execute("CREATE TABLE insumos (id INTEGER PRIMARY KEY, nombre TEXT UNIQUE, stock INTEGER)");
  db.execute("INSERT INTO insumos (nombre, stock) VALUES ($1, $2)", ["Masa de Pizza", 24]);

  assert.deepEqual(await asegurarUsuarioDefault(db), {
    requiereConfiguracionInicial: false,
    sinAdministrador: false,
  });
  assert.deepEqual(db.select("SELECT nombre, pin_acceso, rol FROM usuarios ORDER BY id"), [
    { nombre: "Admin A", pin_acceso: "9999", rol: "admin" },
    { nombre: "Admin B", pin_acceso: "2580", rol: "admin" },
    { nombre: "Caja", pin_acceso: "1234", rol: "cajero" },
  ]);
  assert.equal(db.select("SELECT stock FROM insumos WHERE nombre = $1", ["Masa de Pizza"])[0].stock, 24);
  assert.equal(db.select("SELECT COUNT(*) AS total FROM usuarios")[0].total, 3);
});

test("la primera cuenta requiere elección explícita y usa PIN almacenado como hash", async () => {
  const db = new ConexionSQLiteTemporal();
  assert.deepEqual(await asegurarUsuarioDefault(db), {
    requiereConfiguracionInicial: true,
    sinAdministrador: false,
  });
  await assert.rejects(crearAdministradorInicial("Admin", "9999", db), { message: "PIN_PREDETERMINADO" });
  assert.equal(db.select("SELECT COUNT(*) AS total FROM usuarios")[0].total, 0);

  await crearAdministradorInicial("Admin inicial", "5842", db);
  assert.deepEqual(await asegurarUsuarioDefault(db), {
    requiereConfiguracionInicial: false,
    sinAdministrador: false,
  });
  const stored = db.select("SELECT pin_acceso FROM usuarios WHERE rol = 'admin'")[0].pin_acceso;
  assert.notEqual(stored, "5842");
  assert.match(stored, /^pbkdf2-sha256\$/);

  const result = await procesarAperturaCaja("5842", "500", db);
  assert.equal(result.rol, "admin");
  assert.equal(result.operacion, "NUEVA_APERTURA");
  await assert.rejects(procesarAperturaCaja("0000", "500", db), { message: "PIN_INCORRECTO" });
});

test("una base con cajeros pero sin administrador no eleva roles ni pierde acceso", async () => {
  const db = new ConexionSQLiteTemporal();
  db.execute("INSERT INTO usuarios (nombre, pin_acceso, rol) VALUES ($1, $2, $3)", ["Caja existente", "7315", "cajero"]);
  assert.deepEqual(await asegurarUsuarioDefault(db), {
    requiereConfiguracionInicial: false,
    sinAdministrador: true,
  });

  const login = await procesarAperturaCaja("7315", "500", db);
  assert.equal(login.rol, "cajero");
  assert.equal(db.select("SELECT COUNT(*) AS total FROM usuarios")[0].total, 1);
});

test("login migra PIN heredado sin cambiarlo y reanuda la caja existente", async () => {
  const db = new ConexionSQLiteTemporal();
  db.execute("INSERT INTO usuarios (nombre, pin_acceso, rol) VALUES ($1, $2, $3)", ["Admin heredado", "9999", "admin"]);
  db.execute("INSERT INTO sesiones_caja (usuario_abrio_id, fecha_hora_apertura, fondo_inicial) VALUES (1, $1, 375)", [new Date().toISOString()]);

  const login = await procesarAperturaCaja("9999", "600", db);
  assert.equal(login.operacion, "REANUDACION");
  assert.equal(login.fondoReal, 375);
  assert.equal(login.rol, "admin");
  assert.equal(login.usuarioId, 1);
  assert.match(db.select("SELECT pin_acceso FROM usuarios WHERE id = 1")[0].pin_acceso, /^pbkdf2-sha256\$/);
  assert.equal(db.select("SELECT COUNT(*) AS total FROM sesiones_caja")[0].total, 1);
});

test("gestión de usuarios conserva otros administradores y no expone ni elimina cuentas admin", async () => {
  const db = new ConexionSQLiteTemporal();
  db.execute("INSERT INTO usuarios (nombre, pin_acceso, rol) VALUES ($1, $2, $3)", ["Admin A", "1357", "admin"]);
  db.execute("INSERT INTO usuarios (nombre, pin_acceso, rol) VALUES ($1, $2, $3)", ["Admin B", "2468", "admin"]);
  await crearEmpleado("Cajero", "7314", db);

  const staff = await obtenerEmpleados(db);
  assert.deepEqual(staff, [{ id: 3, nombre: "Cajero" }]);
  assert.equal("pin_acceso" in staff[0], false);
  await assert.rejects(crearEmpleado("PIN repetido", "1357", db), { message: "PIN_DUPLICADO" });
  await actualizarPinEmpleado(3, "9630", db);
  await assert.rejects(procesarAperturaCaja("7314", "500", db), { message: "PIN_INCORRECTO" });
  assert.equal((await procesarAperturaCaja("9630", "500", db)).usuarioId, 3);
  await actualizarPinAdmin(1, "8642", db);
  assert.equal(db.select("SELECT pin_acceso FROM usuarios WHERE id = 2")[0].pin_acceso, "2468");
  assert.equal(await procesarAperturaCaja("1357", "500", db).catch(() => null), null);
  assert.equal((await procesarAperturaCaja("8642", "500", db)).rol, "admin");
  assert.equal((await procesarAperturaCaja("2468", "500", db)).usuarioId, 2);
  assert.match(db.select("SELECT pin_acceso FROM usuarios WHERE id = 2")[0].pin_acceso, /^pbkdf2-sha256\$/);

  await eliminarEmpleado(1, db);
  assert.equal(db.select("SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'admin'")[0].total, 2);
  await assert.rejects(eliminarEmpleado(3, db));
  assert.equal(db.select("SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'cajero'")[0].total, 1);
});
