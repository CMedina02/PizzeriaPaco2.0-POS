const HASH_VERSION = "pbkdf2-sha256";
const HASH_ITERATIONS = 600_000;
const PIN_LENGTH = 4;
const PINES_PREDETERMINADOS = new Set(["1234", "9999"]);

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex) {
  if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) return null;
  return Uint8Array.from(hex.match(/.{2}/g), (byte) => parseInt(byte, 16));
}

function compararConstanteTiempo(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export function esPinValido(pin) {
  return typeof pin === "string" && /^\d{4}$/.test(pin);
}

export function esPinPredeterminado(pin) {
  return PINES_PREDETERMINADOS.has(pin);
}

async function derivarHash(pin, salt, iterations) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashearPin(pin) {
  if (!esPinValido(pin)) throw new Error("PIN_INVALIDO");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivarHash(pin, salt, HASH_ITERATIONS);
  return `${HASH_VERSION}$${HASH_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(hash)}`;
}

export async function verificarPin(pin, credencial) {
  if (!esPinValido(pin) || typeof credencial !== "string") return false;

  if (!credencial.startsWith(`${HASH_VERSION}$`)) {
    return compararConstanteTiempo(pin, credencial);
  }

  const [, iterationText, saltText, expectedText, ...extra] = credencial.split("$");
  const iterations = Number(iterationText);
  const salt = hexToBytes(saltText);
  const expected = hexToBytes(expectedText);
  if (
    extra.length || !Number.isInteger(iterations) || iterations < 100_000 ||
    iterations > 1_000_000 || !salt || salt.length !== 16 || !expected || expected.length !== 32
  ) {
    return false;
  }

  const actual = bytesToHex(await derivarHash(pin, salt, iterations));
  return compararConstanteTiempo(actual, expectedText);
}

export function requiereMigracionPin(credencial) {
  return typeof credencial === "string" && !credencial.startsWith(`${HASH_VERSION}$`);
}
