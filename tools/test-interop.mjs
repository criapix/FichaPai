// Verifica a interoperabilidade: descriptografa, com o MESMO código do navegador
// (js/crypto.js), o blob gerado pela CLI Node. Também testa senha incorreta.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { decryptData } from "../js/crypto.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const blob = JSON.parse(readFileSync(join(ROOT, "data", "dados.enc.json"), "utf8"));
const esperado = readFileSync(join(ROOT, "tools", ".dados.plain.json"), "utf8");
const senha = process.env.DADOS_SENHA;

const obj = await decryptData(blob, senha);
const ok = JSON.stringify(JSON.parse(esperado)) === JSON.stringify(obj);
console.log(ok ? "OK: navegador descriptografa o blob da CLI (interop confirmada)." : "FALHA: conteúdo divergente!");
if (!ok) process.exit(1);

// senha incorreta deve falhar
let falhou = false;
try { await decryptData(blob, senha + "x"); } catch { falhou = true; }
console.log(falhou ? "OK: senha incorreta é rejeitada." : "FALHA: senha incorreta foi aceita!");
if (!falhou) process.exit(1);

console.log(`Resumo: ${obj.medicos.length} médicos, ${obj.consultas.length} consultas, ${obj.exames.length} exames, ${obj.medicamentos.length} medicamentos.`);
