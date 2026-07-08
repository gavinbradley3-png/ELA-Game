import { randomUUID, randomBytes, randomInt } from "node:crypto";

export function newId(): string {
  return randomUUID();
}

export function newToken(): string {
  return randomBytes(24).toString("base64url");
}

// Unambiguous alphabet: no 0/O, 1/I/L, 5/S.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRTUVWXYZ2346789";

export function newJoinCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeJoinCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/0/g, "O") // alphabet has no 0/O anyway; strip lookalikes defensively
    .slice(0, 8);
}
