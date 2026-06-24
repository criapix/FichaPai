#!/usr/bin/env node
// CLI de criptografia para os dados do app de acompanhamento.
//
// Uso:
//   node tools/cripto.mjs encrypt   # lê tools/.dados.plain.json -> grava data/dados.enc.json
//   node tools/cripto.mjs decrypt   # lê data/dados.enc.json -> grava tools/.dados.plain.json
//
// A senha vem da variável de ambiente DADOS_SENHA. Se ausente, é solicitada no terminal
// (entrada oculta). A senha NUNCA é gravada em disco.
//
// Esquema (compatível com Web Crypto / AES-GCM):
//   - PBKDF2-SHA-256, 250000 iterações, salt de 16 bytes
//   - AES-256-GCM, IV de 12 bytes, tag de autenticação de 16 bytes anexada ao ciphertext
//   - Blob: { v, kdf, iter, salt(base64), iv(base64), ct(base64) }
//     onde ct = ciphertext || authTag  (igual ao que o Web Crypto produz/consome)

import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";

const ITER = 250000;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PLAIN_PATH = join(ROOT, "tools", ".dados.plain.json");
const ENC_PATH = join(ROOT, "data", "dados.enc.json");

function deriveKey(password, salt) {
  return pbkdf2Sync(Buffer.from(password, "utf8"), salt, ITER, 32, "sha256");
}

function encrypt(password) {
  const plaintext = readFileSync(PLAIN_PATH, "utf8");
  // valida que é JSON antes de criptografar
  JSON.parse(plaintext);

  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveKey(password, salt);

  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const ct = Buffer.concat([ciphertext, tag]); // mesmo layout do Web Crypto

  const blob = {
    v: 1,
    kdf: "PBKDF2",
    iter: ITER,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    ct: ct.toString("base64"),
  };
  writeFileSync(ENC_PATH, JSON.stringify(blob, null, 2) + "\n");
  console.log(`OK: data/dados.enc.json gerado (${ct.length} bytes cifrados).`);
}

function decrypt(password) {
  const blob = JSON.parse(readFileSync(ENC_PATH, "utf8"));
  const salt = Buffer.from(blob.salt, "base64");
  const iv = Buffer.from(blob.iv, "base64");
  const ctFull = Buffer.from(blob.ct, "base64");
  const tag = ctFull.subarray(ctFull.length - 16);
  const ciphertext = ctFull.subarray(0, ctFull.length - 16);
  const key = deriveKey(password, salt);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  let plaintext;
  try {
    plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    console.error("ERRO: senha incorreta ou dados corrompidos.");
    process.exit(1);
  }
  JSON.parse(plaintext); // valida
  writeFileSync(PLAIN_PATH, plaintext.endsWith("\n") ? plaintext : plaintext + "\n");
  console.log("OK: tools/.dados.plain.json gerado. Lembre de apagá-lo após editar e recriptografar.");
}

function promptPassword() {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    // oculta a digitação
    const stdout = process.stdout;
    rl._writeToOutput = () => stdout.write("");
    stdout.write("Senha: ");
    rl.question("", (answer) => {
      stdout.write("\n");
      rl.close();
      resolve(answer);
    });
  });
}

async function getPassword() {
  if (process.env.DADOS_SENHA && process.env.DADOS_SENHA.length > 0) {
    return process.env.DADOS_SENHA;
  }
  if (!process.stdin.isTTY) {
    console.error("ERRO: defina a variável DADOS_SENHA (terminal não interativo).");
    process.exit(1);
  }
  return promptPassword();
}

const cmd = process.argv[2];
const password = await getPassword();

if (cmd === "encrypt") {
  encrypt(password);
} else if (cmd === "decrypt") {
  decrypt(password);
} else {
  console.error("Uso: node tools/cripto.mjs <encrypt|decrypt>");
  process.exit(1);
}
