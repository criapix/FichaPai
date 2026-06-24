import { decryptData } from "./crypto.js";

// ---------- Log de diagnóstico (visível no Console do navegador) ----------
const T0 = performance.now();
function log(...args) {
  console.log(`[FichaPai +${(performance.now() - T0).toFixed(0)}ms]`, ...args);
}
log("app.js carregado. URL:", location.href);

// ---------- Estado ----------
let dados = null; // dados descriptografados (somente em memória)
const elLogin = document.getElementById("tela-login");
const elApp = document.getElementById("app");
const elConteudo = document.getElementById("conteudo");
const elTitulo = document.getElementById("titulo-tela");
const elVoltar = document.getElementById("btn-voltar");

// ---------- Utilidades ----------
function esc(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function formatarData(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso || "";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

function hoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function telLink(num) {
  const limpo = String(num).replace(/[^\d+]/g, "");
  return `<a href="tel:${esc(limpo)}">${esc(num)}</a>`;
}
function emailLink(e) {
  return `<a href="mailto:${esc(e)}">${esc(e)}</a>`;
}
function urlLink(u) {
  const href = /^https?:\/\//.test(u) ? u : `https://${u}`;
  return `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(u)}</a>`;
}

function linha(rotulo, valorHtml) {
  if (!valorHtml) return "";
  return `<div class="linha"><span class="rotulo">${esc(rotulo)}</span><span class="valor">${valorHtml}</span></div>`;
}

// ---------- Definição das seções ----------
const SECOES = {
  paciente:    { titulo: "Dados pessoais", emoji: "👤", render: renderPaciente,    qtd: () => "" },
  condicoes:   { titulo: "Condições médicas", emoji: "🩺", render: renderCondicoes, qtd: (d) => (d.condicoesMedicas || []).length },
  medicamentos:{ titulo: "Medicamentos", emoji: "💊", render: renderMedicamentos,  qtd: (d) => (d.medicamentos || []).length },
  cirurgias:   { titulo: "Cirurgias", emoji: "🏥", render: renderCirurgias,        qtd: (d) => (d.cirurgias || []).length },
  planos:      { titulo: "Planos", emoji: "💳", render: renderPlanos,              qtd: (d) => (d.planos || []).length },
  medicos:     { titulo: "Médicos", emoji: "👨‍⚕️", render: renderMedicos,          qtd: (d) => (d.medicos || []).length },
  consultas:   { titulo: "Consultas", emoji: "📅", render: renderConsultas,        qtd: (d) => (d.consultas || []).length },
  exames:      { titulo: "Exames", emoji: "🔬", render: renderExames,              qtd: (d) => (d.exames || []).length },
  casaRepouso: { titulo: "Casa de repouso", emoji: "🏡", render: renderCasaRepouso, qtd: () => "" },
};

// ---------- Render das telas ----------
function renderInicio() {
  const proximos = [];
  for (const c of dados.consultas || []) {
    if (c.status === "agendada" && c.data >= hoje()) {
      proximos.push({ data: c.data, hora: c.hora, titulo: c.medico || "Consulta", tipo: "Consulta", local: c.local });
    }
  }
  for (const e of dados.exames || []) {
    if (e.status === "agendado" && e.data >= hoje()) {
      proximos.push({ data: e.data, hora: e.hora, titulo: e.tipo || "Exame", tipo: "Exame", local: e.local });
    }
  }
  proximos.sort((a, b) => (a.data + (a.hora || "")).localeCompare(b.data + (b.hora || "")));

  let html = `<h2 class="secao-titulo">Próximos eventos</h2>`;
  if (proximos.length === 0) {
    html += `<div class="item vazio">Nenhuma consulta ou exame agendado para os próximos dias.</div>`;
  } else {
    for (const p of proximos) {
      html += `<div class="item proximo">
        <div class="quando">${esc(formatarData(p.data))}${p.hora ? " · " + esc(p.hora) : ""}</div>
        <h3>${esc(p.titulo)} <span class="tag">${esc(p.tipo)}</span></h3>
        ${p.local ? linha("Local", esc(p.local)) : ""}
      </div>`;
    }
  }

  html += `<h2 class="secao-titulo">Seções</h2><div class="menu-grid">`;
  for (const [chave, s] of Object.entries(SECOES)) {
    const q = s.qtd(dados);
    html += `<button class="menu-card" data-secao="${chave}">
      <span class="emoji">${s.emoji}</span>
      <span class="titulo">${esc(s.titulo)}</span>
      ${q !== "" ? `<span class="qtd">${q} ${q === 1 ? "registro" : "registros"}</span>` : ""}
    </button>`;
  }
  html += `</div>`;
  return html;
}

function renderPaciente() {
  const p = dados.paciente || {};
  let html = `<div class="item">`;
  if (p.nome) html += `<h3>${esc(p.nome)}</h3>`;
  html += linha("Mãe", esc(p.mae));
  html += linha("Nascimento", esc(formatarData(p.nascimento)));
  html += linha("Peso", esc(p.peso));
  html += linha("Altura", esc(p.altura));
  html += linha("Endereço", esc(p.endereco));
  for (const c of p.contatos || []) {
    if (c.tipo === "email") html += linha("E-mail", emailLink(c.valor));
    else html += linha(c.tipo === "telefone" ? "Telefone" : (c.tipo || "Contato"), telLink(c.valor));
  }
  html += `</div>`;

  if ((p.documentos || []).length) {
    html += `<h2 class="secao-titulo">Documentos</h2>`;
    for (const doc of p.documentos) {
      html += `<div class="item"><h3>${esc(doc.tipo)}</h3>${linha("Número", esc(doc.numero))}${doc.obs ? `<div class="obs">${esc(doc.obs)}</div>` : ""}</div>`;
    }
  }
  return html;
}

function renderCondicoes() {
  const lista = dados.condicoesMedicas || [];
  if (!lista.length) return vazio("Nenhuma condição registrada.");
  return `<div class="item">${lista.map((c) => `<div class="dado-linha"><span class="valor">${esc(c)}</span></div>`).join("")}</div>`;
}

function renderMedicamentos() {
  const lista = dados.medicamentos || [];
  if (!lista.length) return vazio("Nenhum medicamento registrado.");
  return lista.map((m) => `<div class="item">
    <h3>${esc(m.nome)}</h3>
    ${linha("Objetivo", esc(m.objetivo))}
    ${linha("Uso", esc(m.uso))}
    ${linha("Médico", esc(m.medico))}
  </div>`).join("");
}

function renderCirurgias() {
  const lista = dados.cirurgias || [];
  if (!lista.length) return vazio("Nenhuma cirurgia registrada.");
  return lista.map((c) => `<div class="item">
    <h3>${esc(c.descricao)}</h3>
    ${linha("Data", esc(formatarData(c.data)))}
    ${c.obs ? `<div class="obs">${esc(c.obs)}</div>` : ""}
  </div>`).join("");
}

function renderPlanos() {
  const lista = dados.planos || [];
  if (!lista.length) return vazio("Nenhum plano registrado.");
  return lista.map((p) => `<div class="item">
    <h3>${esc(p.operadora || "Plano")} <span class="tag">${esc(p.tipo === "dentario" ? "Dentário" : "Saúde")}</span></h3>
    ${linha("Plano", esc(p.plano))}
    ${linha("Carteira", esc(p.numeroCarteira))}
    ${linha("Validade", esc(formatarData(p.validade)))}
    ${p.telefoneOperadora ? linha("Telefone", telLink(p.telefoneOperadora)) : ""}
    ${p.obs ? `<div class="obs">${esc(p.obs)}</div>` : ""}
  </div>`).join("");
}

function renderMedicos() {
  const lista = dados.medicos || [];
  if (!lista.length) return vazio("Nenhum médico registrado.");
  return lista.map((m) => {
    const tels = (m.telefones || []).filter(Boolean).map(telLink).join(" · ");
    return `<div class="item">
      <h3>${esc(m.nome)}</h3>
      ${linha("Especialidade", esc(m.especialidade))}
      ${tels ? linha("Telefones", tels) : ""}
      ${m.email ? linha("E-mail", emailLink(m.email)) : ""}
      ${linha("Endereço", esc(m.endereco))}
      ${m.obs ? `<div class="obs">${esc(m.obs)}</div>` : ""}
    </div>`;
  }).join("");
}

function renderConsultas() {
  const lista = [...(dados.consultas || [])];
  if (!lista.length) return vazio("Nenhuma consulta registrada.");
  lista.sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  const agendada = (c) => c.status === "agendada" && (!c.data || c.data >= hoje());
  const futuras = lista.filter(agendada);
  const resto = lista.filter((c) => !agendada(c));
  let html = "";
  if (futuras.length) html += `<h2 class="secao-titulo">Agendadas</h2>` + futuras.map(consultaItem).join("");
  if (resto.length) html += `<h2 class="secao-titulo">Histórico</h2>` + resto.map(consultaItem).join("");
  return html;
}
function consultaItem(c) {
  const ag = c.status === "agendada";
  return `<div class="item${ag ? " proximo" : ""}">
    <h3>${esc(c.medico || "Consulta")} <span class="tag ${ag ? "agendado" : "realizado"}">${ag ? "Agendada" : "Realizada"}</span></h3>
    ${linha("Data", (c.data ? esc(formatarData(c.data)) : "A agendar") + (c.hora ? " · " + esc(c.hora) : ""))}
    ${linha("Local", esc(c.local))}
    ${c.resultado ? `<div class="obs">${esc(c.resultado)}</div>` : ""}
  </div>`;
}

function renderExames() {
  const lista = [...(dados.exames || [])];
  if (!lista.length) return vazio("Nenhum exame registrado.");
  lista.sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  const agendado = (e) => e.status === "agendado" && (!e.data || e.data >= hoje());
  const futuros = lista.filter(agendado);
  const resto = lista.filter((e) => !agendado(e));
  let html = "";
  if (futuros.length) html += `<h2 class="secao-titulo">Agendados</h2>` + futuros.map(exameItem).join("");
  if (resto.length) html += `<h2 class="secao-titulo">Histórico</h2>` + resto.map(exameItem).join("");
  return html;
}
function exameItem(e) {
  const ag = e.status === "agendado";
  let portal = "";
  if (e.portal && e.portal.url) {
    portal = `<div class="obs"><strong>Laudo online:</strong> ${urlLink(e.portal.url)}`;
    if (e.portal.login) portal += `<br>Login: ${esc(e.portal.login)}`;
    if (e.portal.senha) portal += `<br>Senha: ${esc(e.portal.senha)}`;
    if (e.portal.validadeLaudo) portal += `<br>Disponível em: ${esc(formatarData(e.portal.validadeLaudo))}`;
    portal += `</div>`;
  }
  return `<div class="item${ag ? " proximo" : ""}">
    <h3>${esc(e.tipo || "Exame")} <span class="tag ${ag ? "agendado" : "realizado"}">${ag ? "Agendado" : "Realizado"}</span></h3>
    ${linha("Data", (e.data ? esc(formatarData(e.data)) : "A agendar") + (e.hora ? " · " + esc(e.hora) : ""))}
    ${linha("Local", esc(e.local))}
    ${linha("Solicitante", esc(e.solicitante))}
    ${e.preparo ? `<div class="preparo-bloco"><strong>⚠️ Preparo</strong><br>${esc(e.preparo)}</div>` : ""}
    ${e.resultado ? `<div class="obs">${esc(e.resultado)}</div>` : ""}
    ${portal}
  </div>`;
}

function renderCasaRepouso() {
  const c = dados.casaRepouso || {};
  let html = `<div class="item">`;
  html += `<h3>${esc(c.nome || "Casa de repouso")}</h3>`;
  html += linha("Endereço", esc(c.endereco));
  if (c.telefone) html += linha("Telefone", telLink(c.telefone));
  html += `</div>`;
  if ((c.contatos || []).length) {
    const rotulos = { medico: "Médico", enfermeiro: "Enfermeiro", responsavel: "Responsável" };
    html += `<h2 class="secao-titulo">Contatos</h2>`;
    for (const ct of c.contatos) {
      html += `<div class="item">
        <h3>${esc(ct.nome)} <span class="tag">${esc(rotulos[ct.funcao] || ct.funcao || "Contato")}</span></h3>
        ${ct.telefone ? linha("Telefone", telLink(ct.telefone)) : ""}
      </div>`;
    }
  }
  if (!c.nome && !(c.contatos || []).length) return vazio("Dados da casa de repouso ainda não cadastrados.");
  return html;
}

function vazio(msg) {
  return `<div class="item vazio">${esc(msg)}</div>`;
}

// ---------- Navegação ----------
function navegar(secao) {
  log("navegar():", secao);
  if (secao === "inicio" || !SECOES[secao]) {
    elTitulo.textContent = "Início";
    elVoltar.hidden = true;
    elConteudo.innerHTML = renderInicio();
    elConteudo.querySelectorAll("[data-secao]").forEach((b) =>
      b.addEventListener("click", () => navegar(b.dataset.secao))
    );
  } else {
    const s = SECOES[secao];
    elTitulo.textContent = s.titulo;
    elVoltar.hidden = false;
    elConteudo.innerHTML = s.render();
  }
  window.scrollTo(0, 0);
}

// ---------- Login ----------
const CHAVE_SENHA = "fichapai:senha"; // onde a senha fica guardada (se o usuário optar)

// Carrega o blob e descriptografa. Em caso de erro, lança um Error com .tipo
// = "rede" (falha ao carregar) ou "senha" (descriptografia falhou).
async function carregarDados(senha) {
  log("1) Buscando data/dados.enc.json … (controlado por service worker?", !!navigator.serviceWorker?.controller, ")");
  const ctrl = new AbortController();
  const limite = setTimeout(() => { log("1) TIMEOUT de 20s atingido, abortando fetch"); ctrl.abort(); }, 20000);
  let resp;
  try {
    resp = await fetch("data/dados.enc.json", { cache: "no-store", signal: ctrl.signal });
  } catch (e) {
    const motivo = e && e.name === "AbortError" ? "tempo esgotado" : (e && e.message) || "erro de rede";
    throw Object.assign(new Error(motivo), { tipo: "rede" });
  } finally {
    clearTimeout(limite);
  }
  log("1) Resposta recebida. status:", resp.status, "ok:", resp.ok, "tipo:", resp.type);
  if (!resp.ok) throw Object.assign(new Error("HTTP " + resp.status), { tipo: "rede" });
  const blob = await resp.json();
  log("1) JSON carregado. versão do blob:", blob && blob.v, "iter:", blob && blob.iter);

  log("2) Iniciando descriptografia (PBKDF2 + AES-GCM)…");
  const tDec = performance.now();
  try {
    const d = await decryptData(blob, senha);
    log("2) Descriptografia OK em", (performance.now() - tDec).toFixed(0), "ms");
    return d;
  } catch (e) {
    throw Object.assign(new Error("senha incorreta"), { tipo: "senha", causa: e });
  }
}

function abrirApp() {
  log("3) Entrando no app e renderizando o início…");
  document.getElementById("status-login").hidden = true;
  elLogin.hidden = true;
  elApp.hidden = false;
  navegar("inicio");
  log("3) Pronto. App visível.");
}

async function entrar(ev) {
  ev.preventDefault();
  const btn = document.getElementById("btn-entrar");
  const erro = document.getElementById("erro-login");
  const status = document.getElementById("status-login");
  const senha = document.getElementById("senha").value;
  const lembrar = document.getElementById("lembrar").checked;
  log("entrar(): submit recebido. Tamanho da senha:", senha.length, "| lembrar:", lembrar);
  erro.hidden = true;
  status.hidden = false;
  status.textContent = "Descriptografando…";
  btn.disabled = true;

  try {
    dados = await carregarDados(senha);
  } catch (e) {
    console.error("[FichaPai] Falha no login:", e);
    status.hidden = true;
    erro.hidden = false;
    btn.disabled = false;
    if (e.tipo === "senha") {
      erro.textContent = "Senha incorreta. Tente novamente.";
      document.getElementById("senha").select();
    } else {
      erro.textContent = "Não foi possível carregar os dados (" + e.message + "). Toque em “Limpar cache e recarregar”.";
    }
    return;
  }

  // Guarda (ou remove) a senha conforme a escolha do usuário
  try {
    if (lembrar) { localStorage.setItem(CHAVE_SENHA, senha); log("senha guardada localmente para auto-login"); }
    else { localStorage.removeItem(CHAVE_SENHA); }
  } catch (e) { console.error("[FichaPai] localStorage indisponível:", e); }

  abrirApp();
}

// Tenta entrar automaticamente com a senha guardada (se houver).
async function autoLogin() {
  let senha = null;
  try { senha = localStorage.getItem(CHAVE_SENHA); } catch {}
  if (!senha) { log("autoLogin: nenhuma senha guardada."); return; }

  log("autoLogin: senha guardada encontrada, entrando automaticamente…");
  const status = document.getElementById("status-login");
  document.getElementById("senha").value = senha; // exibido como pontos
  status.hidden = false;
  status.textContent = "Entrando…";

  try {
    dados = await carregarDados(senha);
  } catch (e) {
    log("autoLogin: falhou (", e.tipo, ") — exibindo tela de login.");
    status.hidden = true;
    if (e.tipo === "senha") {
      // senha guardada não vale mais (ex.: senha foi trocada) — descarta
      try { localStorage.removeItem(CHAVE_SENHA); } catch {}
      document.getElementById("senha").value = "";
      const erro = document.getElementById("erro-login");
      erro.hidden = false;
      erro.textContent = "A senha salva não é mais válida. Digite novamente.";
    }
    return;
  }
  abrirApp();
}

// Remove service worker e caches antigos e recarrega — resolve telas presas por cache.
async function limparCache() {
  log("limparCache(): iniciando limpeza de service workers e caches");
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      log("limparCache(): removendo", regs.length, "service worker(s)");
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if (window.caches) {
      const chaves = await caches.keys();
      log("limparCache(): apagando caches:", chaves);
      await Promise.all(chaves.map((k) => caches.delete(k)));
    }
  } catch (e) {
    console.error("[FichaPai] erro ao limpar cache:", e);
  }
  log("limparCache(): recarregando a página");
  location.reload();
}

function sair() {
  log("sair(): encerrando sessão e apagando senha guardada");
  dados = null;
  try { localStorage.removeItem(CHAVE_SENHA); } catch {}
  elApp.hidden = true;
  elLogin.hidden = false;
  document.getElementById("senha").value = "";
  document.getElementById("erro-login").hidden = true;
  document.getElementById("status-login").hidden = true;
  document.getElementById("btn-entrar").disabled = false;
}

document.getElementById("form-login").addEventListener("submit", entrar);
document.getElementById("btn-limpar").addEventListener("click", limparCache);
document.getElementById("btn-voltar").addEventListener("click", () => navegar("inicio"));
document.getElementById("btn-sair").addEventListener("click", sair);

// Exposto apenas para testes automatizados (inofensivo no navegador).
export { navegar };

log("handlers de login registrados.");

// Auto-login se houver senha guardada neste dispositivo.
autoLogin();

// ---------- Service worker (PWA) ----------
if ("serviceWorker" in navigator) {
  log("service worker suportado. Controlando esta página agora?", !!navigator.serviceWorker.controller);
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js")
      .then((reg) => log("service worker registrado. escopo:", reg.scope))
      .catch((e) => console.error("[FichaPai] falha ao registrar service worker:", e));
  });
} else {
  log("service worker NÃO suportado neste navegador.");
}
