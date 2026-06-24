// Descriptografia no navegador usando Web Crypto (AES-GCM + PBKDF2).
// Compatível com o blob gerado por tools/cripto.mjs.

function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function deriveKey(password, salt, iterations) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
}

// Recebe o blob ({v,iter,salt,iv,ct}) e a senha. Retorna o objeto de dados.
// Lança erro se a senha estiver incorreta (falha na verificação da tag GCM).
async function decryptData(blob, password) {
  const salt = base64ToBytes(blob.salt);
  const iv = base64ToBytes(blob.iv);
  const ct = base64ToBytes(blob.ct); // ciphertext || authTag (16 bytes)
  const key = await deriveKey(password, salt, blob.iter || 250000);
  const plaintextBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  const json = new TextDecoder().decode(plaintextBuf);
  return JSON.parse(json);
}

export { decryptData };
