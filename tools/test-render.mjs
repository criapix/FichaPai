// Smoke test da renderização: simula o DOM, faz "login" com os dados reais e
// renderiza TODAS as seções, garantindo que nenhuma função de render lança erro.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const blobJson = readFileSync(join(ROOT, "data", "dados.enc.json"), "utf8");
const senha = process.env.DADOS_SENHA;

// ---- Stub mínimo de DOM ----
const handlers = {};
function makeEl() {
  return {
    value: senha, hidden: false, disabled: false, textContent: "", innerHTML: "",
    addEventListener(ev, fn) { handlers[this._id + ":" + ev] = fn; },
    querySelectorAll() { return []; },
    select() {},
  };
}
const els = {};
globalThis.document = {
  getElementById(id) { if (!els[id]) { els[id] = makeEl(); els[id]._id = id; } return els[id]; },
};
globalThis.window = { addEventListener() {}, scrollTo() {}, caches: undefined }; // navigator nativo do Node não tem serviceWorker
globalThis.location = { href: "http://teste/", reload() {} };
const _ls = new Map();
globalThis.localStorage = { getItem: (k) => (_ls.has(k) ? _ls.get(k) : null), setItem: (k, v) => _ls.set(k, String(v)), removeItem: (k) => _ls.delete(k) };
globalThis.fetch = async () => ({ ok: true, json: async () => JSON.parse(blobJson) });

const { navegar } = await import("../js/app.js");

// dispara o submit do login (resolve a Promise interna)
await handlers["form-login:submit"]({ preventDefault() {} });

const conteudo = els["conteudo"];
if (!conteudo.innerHTML || conteudo.innerHTML.length < 50) {
  console.error("FALHA: painel inicial não renderizou."); process.exit(1);
}
console.log("OK: login + painel inicial renderizados.");

// renderiza cada seção
const secoes = ["paciente", "condicoes", "medicamentos", "cirurgias", "planos", "medicos", "consultas", "exames", "casaRepouso"];
for (const s of secoes) {
  navegar(s);
  if (!conteudo.innerHTML || conteudo.innerHTML.length < 10) {
    console.error(`FALHA: seção ${s} vazia.`); process.exit(1);
  }
  console.log(`OK: seção ${s} renderizou (${conteudo.innerHTML.length} chars).`);
}

// checagens de conteúdo esperado
navegar("medicos");
if (!conteudo.innerHTML.includes('href="tel:')) { console.error("FALHA: sem links tel:"); process.exit(1); }
if (!conteudo.innerHTML.includes("mxvelmo@gmail.com")) { console.error("FALHA: e-mail ausente"); process.exit(1); }
console.log("OK: links tel:/e-mail presentes.");

console.log("\nTodos os testes de renderização passaram.");
