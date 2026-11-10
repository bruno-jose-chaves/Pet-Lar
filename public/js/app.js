// Pet Lar · painel — roteador, login e moldura do app
import { $, esc, toast, modal } from "./ui.js";

const ICON = {
  hoje: '<path d="M4 11l8-7 8 7M6 10v10h12V10"/>',
  propostas: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  pets: '<ellipse cx="12" cy="16" rx="4.5" ry="3.6"/><circle cx="6.5" cy="10.5" r="1.8"/><circle cx="9.8" cy="7" r="1.8"/><circle cx="14.2" cy="7" r="1.8"/><circle cx="17.5" cy="10.5" r="1.8"/>',
  agenda: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  mais: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
};
const svg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>`;

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
];

let current = null; // {destroy}
let session = null;
let navGuard = null;
let lastHash = location.hash; // função async que pode bloquear a saída (alterações não salvas)
export function setNavGuard(fn) { navGuard = fn; }
export function replaceHash(h) { history.replaceState(null, "", h); lastHash = h; }

function shell() {
  const top = [["hoje", "Hoje"], ["propostas", "Propostas"], ["pets", "Pets"], ["tutores", "Tutores"], ["agenda", "Agenda"], ["financeiro", "Financeiro"], ["config", "Ajustes"]];
  $("#root").innerHTML = `<div class="app">
    <header class="appbar">
      <a class="brand" href="#/hoje"><img src="/assets/avatar.webp" alt="Pet Lar" width="36" height="36"><b>Pet Lar</b></a>
      <span class="page-title" id="pageTitle"></span>
      <nav class="topnav" aria-label="Menu">${top.map(([k, t]) => `<a href="#/${k}" data-nav="${k}">${t}</a>`).join("")}</nav>
      <span class="sp"></span><span class="save-state" id="saveState"></span>
    </header>
    <main class="view" id="view"></main>
    <nav class="bottomnav" aria-label="Menu">
      ${[["hoje", "Hoje"], ["propostas", "Propostas"], ["pets", "Pets"], ["agenda", "Agenda"]].map(([k, t]) => `<a href="#/${k}" data-nav="${k}">${svg(k)}<span>${t}</span></a>`).join("")}
      <a href="#" data-nav="mais" id="navMais">${svg("mais")}<span>Mais</span></a>
    </nav></div>`;
  $("#navMais").addEventListener("click", e => {
    e.preventDefault();
    const m = modal(`<h3>Mais</h3><div class="acts">
      <a class="btn soft" href="#/tutores" data-close>👤 Tutores</a>
      <a class="btn soft" href="#/financeiro" data-close>💰 Financeiro</a>
      <a class="btn soft" href="#/config" data-close>⚙️ Configurações</a>
      <button class="btn danger" data-sair>Sair</button></div>`);
    m.el.querySelector("[data-sair]").addEventListener("click", async () => { m.close(); await sair(); });
  });
}

export async function sair() { const { sb } = await import("./db.js"); await sb.auth.signOut(); location.hash = "#/hoje"; }

async function route() {
  const h = location.hash || "#/hoje";
  if (navGuard && h !== lastHash) {
    const ok = await navGuard(); if (!ok) { history.replaceState(null, "", lastHash); return; }
  }
  navGuard = null; lastHash = h;
  const r = ROUTES.find(x => x.re.test(h)) || ROUTES[0];
  const params = (h.match(r.re) || []).slice(1);
  if (current && current.destroy) { try { current.destroy(); } catch { } }
  current = null;
  document.body.classList.toggle("editing", r.mod === "proposta");
  document.querySelectorAll("[data-nav]").forEach(a => a.classList.toggle("on", a.dataset.nav === r.nav || (a.dataset.nav === r.mod)));
  const view = $("#view"); view.className = "view" + (r.wide ? " wide" : ""); $("#pageTitle").textContent = r.title; $("#saveState").textContent = "";
  view.innerHTML = `<div class="list" style="padding:${r.wide ? "18px" : "0"}"><div class="sk" style="height:34px;width:200px;margin:6px 0 10px"></div><div class="sk sk-item"></div><div class="sk sk-item"></div><div class="sk sk-item"></div></div>`;
  window.scrollTo(0, 0);
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
    if (error) toast(error.message); else { toast("Senha alterada ✓"); m.close(); }
  });
}

let started = false;
async function start() {
  const { sb } = await import("./db.js");
  sb.auth.onAuthStateChange((ev, s) => {
    session = s;
    if (ev === "PASSWORD_RECOVERY") { setTimeout(novaSenha, 300); }
    if (!s) { started = false; loginView(); return; }
    if (!started) { started = true; shell(); route(); }
  });
  const { data } = await sb.auth.getSession();
  session = data.session;
  if (!session) loginView();
}

window.addEventListener("hashchange", () => { if (started) route(); });
window.addEventListener("beforeunload", e => { if (navGuard && window.__dirty) { e.preventDefault(); e.returnValue = ""; } });
// supabase.js é carregado com defer; o módulo roda depois dele
start().catch(e => { console.error(e); $("#root").innerHTML = `<div class="login"><div class="box"><p class="msg err">Sem conexão com o servidor. Verifique a internet e recarregue.</p></div></div>`; });
