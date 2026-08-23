import crypto from "node:crypto";

/**
 * Field-level AES-256-GCM encryption for OwnerRecord's PII columns
 * (idNumberEnc / phoneEnc / emailEnc) — spec Section 5.1: "field-level
 * encryption specifically on the ID number and contact fields, not just
 * whole-disk encryption."
 *
 * This is a second layer on top of Postgres/Supabase's at-rest encryption
 * and the Row Level Security policy restricting the owner_records table —
 * defense in depth, not a substitute for the access controls.
 *
 * Server-only. OWNER_PII_ENCRYPTION_KEY must be 32 bytes, hex-encoded
 * (`openssl rand -hex 32`). Losing this key makes existing encrypted data
 * permanently unrecoverable — back it up as carefully as you'd back up a
 * database credential, and rotate by decrypting-then-re-encrypting every
 * row before removing the old key.
 */

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const hex = process.env.OWNER_PII_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "OWNER_PII_ENCRYPTION_KEY must be set to 64 hex chars (32 bytes) — see .env.example."
    );
  }
  return Buffer.from(hex, "hex");
}

/** Returns "iv:authTag:ciphertext", all hex-encoded, joined with ':'. */
export function encryptField(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), ciphertext.toString("hex")].join(":");
}

export function decryptField(encoded: string): string {
  const [ivHex, authTagHex, ciphertextHex] = encoded.split(":");
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error("Malformed encrypted field — expected 'iv:authTag:ciphertext'.");
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
