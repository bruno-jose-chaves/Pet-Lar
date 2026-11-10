// Pet Lar · painel — roteador, login e moldura do app
import { $, esc, toast, modal } from "./ui.js";
import { perfil, gestao, PAPEIS } from "./perfil.js";

import { ic } from "./icones.js";
const svg = k => ic(k);

// rota → módulo (cada tela é carregada só quando abre)
const ROUTES = [
  { re: /^#?\/?(hoje)?$/, mod: "hoje", nav: "hoje", title: "Hoje" },
  { re: /^#\/propostas$/, mod: "propostas", nav: "propostas", title: "Propostas" },
  { re: /^#\/proposta\/(nova|[\w-]+)(?:\/(duplicar))?$/, mod: "proposta", nav: "propostas", title: "Proposta", wide: true },
  { re: /^#\/pets$/, mod: "pets", nav: "pets", title: "Pets" },
  { re: /^#\/pet\/(novo|[\w-]+)$/, mod: "pet", nav: "pets", title: "Pet" },
  { re: /^#\/tutores$/, mod: "tutores", nav: "mais", title: "Tutores" },
  { re: /^#\/tutor\/(novo|[\w-]+)$/, mod: "tutor", nav: "mais", title: "Tutor" },
  { re: /^#\/agenda$/, mod: "agenda", nav: "agenda", title: "Agenda" },
  { re: /^#\/financeiro$/, mod: "financeiro", nav: "mais", title: "Financeiro" },
  { re: /^#\/config$/, mod: "config", nav: "mais", title: "Configurações" },
  { re: /^#\/ajuda$/, mod: "ajuda", nav: "mais", title: "Como usar" },
  { re: /^#\/cobrar$/, mod: "cobrar", nav: "cobrar", title: "Cobrar resposta" },
  { re: /^#\/diario\/([\w-]+)$/, mod: "diario", nav: "hoje", title: "Diário" },
];
// telas só da gestão (admin e gestora); o banco também bloqueia
const SO_GESTAO = new Set(["propostas", "financeiro", "cobrar"]);

let current = null; // {destroy}
let session = null;
let navGuard = null;
let lastHash = location.hash; // função async que pode bloquear a saída (alterações não salvas)
export function setNavGuard(fn) { navGuard = fn; }
export function replaceHash(h) { history.replaceState(null, "", h); lastHash = h; }

function shell() {
  const g = gestao();
  const top = [["hoje", "Hoje"], g && ["propostas", "Propostas"], g && ["cobrar", "Cobrar"], ["pets", "Pets"], ["tutores", "Tutores"], ["agenda", "Agenda"], g && ["financeiro", "Financeiro"], ["config", "Ajustes"], ["ajuda", "Ajuda"]].filter(Boolean);
  const bottom = g ? [["hoje", "Hoje"], ["propostas", "Propostas"], ["cobrar", "Cobrar"], ["pets", "Pets"], ["agenda", "Agenda"]] : [["hoje", "Hoje"], ["pets", "Pets"], ["agenda", "Agenda"], ["tutores", "Tutores"]];
  document.body.classList.toggle("papel-assistente", !g);
  $("#root").innerHTML = `<div class="app">
    <header class="appbar">
      <a class="brand" href="#/hoje"><img src="/assets/avatar.webp" alt="" width="36" height="36"><img class="wm-img" src="/assets/wordmark.webp" alt="Pet Lar" width="106" height="24"></a>
      <span class="page-title" id="pageTitle"></span>
      <nav class="topnav" aria-label="Menu">${top.map(([k, t]) => `<a href="#/${k}" data-nav="${k}">${t}${k === "cobrar" ? '<i class="badge-n hide" data-badge></i>' : ""}</a>`).join("")}</nav>
      <span class="sp"></span><span class="save-state" id="saveState"></span>
    </header>
    <main class="view" id="view"></main>
    <nav class="bottomnav" aria-label="Menu">
      ${bottom.map(([k, t]) => `<a href="#/${k}" data-nav="${k}">${svg(k)}<span>${t}</span>${k === "cobrar" ? '<i class="badge-n hide" data-badge></i>' : ""}</a>`).join("")}
      <a href="#" data-nav="mais" id="navMais">${svg("mais")}<span>Mais</span></a>
    </nav></div>`;
  $("#navMais").addEventListener("click", e => {
    e.preventDefault();
    const m = modal(`<h3>Mais</h3><div class="acts">
      ${g ? `<a class="btn soft" href="#/tutores" data-close>${ic("tutores")} Tutores</a>
      <a class="btn soft" href="#/financeiro" data-close>${ic("financeiro")} Financeiro</a>` : ""}
      <a class="btn soft" href="#/config" data-close>${ic("config")} Configurações</a>
      <a class="btn soft" href="#/ajuda" data-close>${ic("ajuda")} Como usar</a>
      <p class="muted" style="margin:4px 0 0;text-align:center">${esc(perfil.email || "")} · ${esc(PAPEIS[perfil.papel]?.nome || "")}</p>
      <button class="btn danger" data-sair>${ic("sair")} Sair</button></div>`);
    m.el.querySelector("[data-sair]").addEventListener("click", async () => { m.close(); await sair(); });
  });
}

export async function sair() { const { sb } = await import("./db.js"); await sb.auth.signOut(); location.hash = "#/hoje"; }

// contador de "Cobrar" no menu (quantas propostas pedem cobrança agora)
let badgeT = 0;
async function atualizarBadge() {
  if (Date.now() - badgeT < 15000) return; badgeT = Date.now();
  try {
    const [db, A] = await Promise.all([import("./db.js"), import("./acoes.js")]);
    const [set, todas] = await Promise.all([db.getSettings(), db.propostasEnviadas()]);
    const n = A.agrupar(todas, set.follow_up_dias || 2, set.expira_dias || 15).agora.length;
    document.querySelectorAll("[data-badge]").forEach(b => { b.textContent = n; b.classList.toggle("hide", !n); });
  } catch { }
}
window.addEventListener("petlar:propostas", () => { badgeT = 0; atualizarBadge(); });
async function route() {
  const h = location.hash || "#/hoje";
  if (navGuard && h !== lastHash) {
    const ok = await navGuard(); if (!ok) { history.replaceState(null, "", lastHash); return; }
  }
  navGuard = null; lastHash = h;
  let r = ROUTES.find(x => x.re.test(h)) || ROUTES[0];
  const params = (h.match(r.re) || []).slice(1);
  if (!gestao() && SO_GESTAO.has(r.mod)) { location.replace("#/hoje"); return; }
  if (!gestao() && r.mod === "proposta") r = { ...r, mod: "servico", title: "Serviço", wide: false };
  if (current && current.destroy) { try { current.destroy(); } catch { } }
  current = null;
  document.body.classList.toggle("editing", r.mod === "proposta");
  document.querySelectorAll("[data-nav]").forEach(a => a.classList.toggle("on", a.dataset.nav === r.nav || (a.dataset.nav === r.mod)));
  const view = $("#view"); view.className = "view" + (r.wide ? " wide" : ""); $("#pageTitle").textContent = r.title; $("#saveState").textContent = "";
  view.innerHTML = `<div class="list" style="padding:${r.wide ? "18px" : "0"}"><div class="sk" style="height:34px;width:200px;margin:6px 0 10px"></div><div class="sk sk-item"></div><div class="sk sk-item"></div><div class="sk sk-item"></div></div>`;
  window.scrollTo(0, 0);
  if (gestao()) atualizarBadge();
  try {
    const mod = await import(`./pages/${r.mod}.js`);
    if (location.hash !== h && !(h === "#/hoje" && !location.hash)) return; // trocou de rota enquanto carregava
    current = await mod.mount(view, { params, session }) || null;
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="empty" style="margin:18px">Não consegui abrir esta tela.<br><small>${esc(e.message || e)}</small><br><button class="btn soft" onclick="location.reload()">Tentar de novo</button></div>`;
  }
}

// ---------- login ----------
function loginView(msg, err) {
  document.body.classList.remove("editing");
  $("#root").innerHTML = `<div class="login"><div class="box">
    <img src="/assets/logo-petlar.webp" alt="Pet Lar" width="210">
    <form id="fLogin" autocomplete="on">
      <label class="f">E-mail<input type="email" name="email" required autocomplete="username" inputmode="email" style="width:100%;min-height:46px;border:1px solid var(--line);border-radius:12px;padding:10px 12px;font-size:16px"></label>
      <label class="f">Senha<input type="password" name="senha" required minlength="6" autocomplete="current-password" style="width:100%;min-height:46px;border:1px solid var(--line);border-radius:12px;padding:10px 12px;font-size:16px"></label>
      <button class="btn primary" type="submit">Entrar</button>
      <div class="links"><button class="x" type="button" id="lPrimeiro">Primeiro acesso</button><button class="x" type="button" id="lEsqueci">Esqueci a senha</button></div>
      ${msg ? `<p class="msg ${err ? "err" : ""}">${esc(msg)}</p>` : ""}
    </form></div></div>`;
  const f = $("#fLogin");
  const val = () => ({ email: f.email.value.trim().toLowerCase(), senha: f.senha.value });
  f.addEventListener("submit", async e => {
    e.preventDefault(); const { email, senha } = val(); const b = f.querySelector("button[type=submit]"); b.disabled = true; b.textContent = "Entrando…";
    const { sb } = await import("./db.js");
    const { error } = await sb.auth.signInWithPassword({ email, password: senha });
    if (error) loginView(error.message.includes("confirm") ? "Confirme o e-mail antes de entrar (veja a caixa de entrada)." : "E-mail ou senha incorretos.", true);
  });
  $("#lPrimeiro").addEventListener("click", async () => {
    const { email, senha } = val();
    if (!email || senha.length < 6) { loginView("Para o primeiro acesso, digite seu e-mail e crie uma senha (mínimo 6 caracteres) e toque em “Primeiro acesso”.", true); return; }
    const { sb } = await import("./db.js");
    const { data: ok } = await sb.rpc("email_autorizado", { p_email: email });
    if (!ok) { loginView("Este e-mail ainda não tem acesso. Peça para incluir em Configurações.", true); return; }
    const { data, error } = await sb.auth.signUp({ email, password: senha, options: { emailRedirectTo: location.origin } });
    if (error) { loginView(error.message.includes("registered") ? "Este e-mail já tem cadastro. Use “Entrar” ou “Esqueci a senha”." : error.message, true); return; }
    if (!data.session) loginView("Pronto! Enviamos um link de confirmação para " + email + ". Toque nele e depois entre aqui com a senha.");
  });
  $("#lEsqueci").addEventListener("click", async () => {
    const { email } = val(); if (!email) { loginView("Digite seu e-mail e toque em “Esqueci a senha”.", true); return; }
    const { sb } = await import("./db.js");
    await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin });
    loginView("Se o e-mail tiver acesso, chega um link para criar uma nova senha.");
  });
}

function novaSenha() {
  const m = modal(`<h3>Criar nova senha</h3><form id="fNova"><label class="f">Nova senha<input type="password" name="s" minlength="6" required autocomplete="new-password"></label><div class="acts"><button class="btn primary">Salvar senha</button></div></form>`);
  m.el.querySelector("form").addEventListener("submit", async e => {
    e.preventDefault(); const { sb } = await import("./db.js");
    const { error } = await sb.auth.updateUser({ password: e.target.s.value });
    if (error) toast(error.message); else { toast("Senha alterada"); m.close(); }
  });
}

let started = false;
async function entrar(s) {
  const { sb } = await import("./db.js");
  const { data: papel, error } = await sb.rpc("meu_papel");
  if (error) throw error;
  perfil.email = s.user?.email || null; perfil.papel = papel || null;
  if (!papel) {
    $("#root").innerHTML = `<div class="login"><div class="box"><img src="/assets/logo-petlar.webp" alt="Pet Lar" width="180"><p class="msg err">O e-mail ${esc(perfil.email || "")} não tem mais acesso ao painel. Fale com o administrador.</p><button class="btn soft" id="bSairX">Sair</button></div></div>`;
    $("#bSairX").onclick = sair; return;
  }
  shell(); route();
}
async function start() {
  const { sb } = await import("./db.js");
  sb.auth.onAuthStateChange((ev, s) => {
    session = s;
    if (ev === "PASSWORD_RECOVERY") { setTimeout(novaSenha, 300); }
    if (!s) { started = false; loginView(); return; }
    if (!started) { started = true; entrar(s).catch(e => { started = false; console.error(e); loginView("Não consegui carregar seu acesso. Verifique a internet e tente de novo.", true); }); }
  });
  const { data } = await sb.auth.getSession();
  session = data.session;
  if (!session) loginView();
}

window.addEventListener("hashchange", () => { if (started) route(); });
window.addEventListener("beforeunload", e => { if (navGuard && window.__dirty) { e.preventDefault(); e.returnValue = ""; } });
// supabase.js é carregado com defer; o módulo roda depois dele
start().catch(e => { console.error(e); $("#root").innerHTML = `<div class="login"><div class="box"><p class="msg err">Sem conexão com o servidor. Verifique a internet e recarregue.</p></div></div>`; });
