// Utilitários de interface e formatação (sem dependências)
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const brl = v => "R$ " + Math.round(Number(v) || 0).toLocaleString("pt-BR");
export const brl2 = v => { v = Number(v) || 0; return "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }); };

export function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
export const today = () => iso(new Date());
export function pd(s) { if (!s) return null; const [y, m, d] = String(s).slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d); }
export function fmt(s) { const d = typeof s === "string" ? pd(s) : s; return d ? String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") : ""; }
export function fmtY(s) { const d = typeof s === "string" ? pd(s) : s; return d ? fmt(d) + "/" + d.getFullYear() : ""; }
export function periodo(a, b) { if (!a) return ""; if (!b || a === b) return fmt(a); return fmt(a) + " a " + fmt(b); }
export function addDays(s, n) { const d = pd(s); d.setDate(d.getDate() + n); return iso(d); }
export function relTime(ts) {
  if (!ts) return ""; const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return "agora"; if (diff < 3600) return Math.floor(diff / 60) + " min";
  if (diff < 86400) return Math.floor(diff / 3600) + " h"; const d = Math.floor(diff / 86400); return d + (d > 1 ? " dias" : " dia");
}

export const SERVICOS = { visitas: "Visitas", pacote: "Pacote mensal", estendida: "Visita estendida", hosp: "Hospedagem", banho: "Banho em casa" };
export const STATUS = { rascunho: "Rascunho", enviada: "Enviada", aceita: "Aceita", recusada: "Recusada", expirada: "Expirada", cancelada: "Cancelada" };
export const PORTE_TXT = { P: "Pequeno", M: "Médio", G: "Grande", GG: "Gigante" };
export const pill = st => `<span class="pill ${st}">${STATUS[st] || st}</span>`;
export const svcPill = sv => `<span class="pill ${sv}">${SERVICOS[sv] || sv}</span>`;

export const PAW = `<svg viewBox="0 0 24 24" fill="none" stroke="#6E7F63" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5.5C6 5 4 6.5 3.5 9.5 3 12 4 14 5.5 14l1-4"/><path d="M16 5.5c2-.5 4 1 4.5 4 .5 2.5-.5 4.5-2 4.5l-1-4"/><path d="M7 7.5C8 5.8 10 5 12 5s4 .8 5 2.5c.6 1.3 1 3.5 1 5.5 0 3.5-2.7 6-6 6s-6-2.5-6-6c0-2 .4-4.2 1-5.5z"/><path d="M10 12h.01M14 12h.01"/><path d="M10.8 15.2c.4.5.8.7 1.2.7s.8-.2 1.2-.7"/></svg>`;
export const USER = `<svg viewBox="0 0 24 24" fill="none" stroke="#6E7F63" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c1.3-3.6 4-5.4 7-5.4s5.7 1.8 7 5.4"/></svg>`;

export function debounce(fn, ms = 300) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

export function toast(msg, ms = 3000) {
  document.querySelectorAll(".toast").forEach(x => x.remove());
  const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), ms);
}

// Aviso com botão (ex.: "Desfazer"). O botão some quando o aviso some.
export function toastAcao(msg, label, fn, ms = 6000) {
  document.querySelectorAll(".toast").forEach(x => x.remove());
  const t = document.createElement("div"); t.className = "toast acao"; t.setAttribute("role", "status");
  t.innerHTML = `<span>${esc(msg)}</span><button type="button">${esc(label)}</button>`;
  t.querySelector("button").addEventListener("click", () => { t.remove(); fn(); });
  document.body.appendChild(t); setTimeout(() => t.remove(), ms);
}
export function diasDesde(iso) { if (!iso) return null; return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)); }

export function skeleton(n = 4, cls = "sk-item") { return `<div class="list">${Array.from({ length: n }, () => `<div class="sk ${cls}"></div>`).join("")}</div>`; }

// Modal simples. Retorna {el, close}. onClose opcional.
export function modal(html, { onClose } = {}) {
  const bg = document.createElement("div"); bg.className = "modal-bg";
  bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  const close = () => { bg.remove(); document.removeEventListener("keydown", onKey); onClose && onClose(); };
  const onKey = e => { if (e.key === "Escape") close(); };
  bg.addEventListener("click", e => { if (e.target === bg || e.target.closest("[data-close]")) close(); });
  document.addEventListener("keydown", onKey);
  document.body.appendChild(bg);
  return { el: bg.querySelector(".modal"), close };
}

export function confirmDialog(msg, { ok = "Confirmar", danger = false } = {}) {
  return new Promise(res => {
    const m = modal(`<h3>${esc(msg)}</h3><div class="acts"><button class="btn ${danger ? "danger" : "primary"}" data-ok>${esc(ok)}</button><button class="btn soft" data-close>Cancelar</button></div>`, { onClose: () => res(false) });
    m.el.querySelector("[data-ok]").addEventListener("click", () => { res(true); m.close(); });
  });
}

// Carrega um script uma vez só (bibliotecas pesadas só quando precisa)
const loaded = {};
export function loadScript(src) {
  return loaded[src] ||= new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => { delete loaded[src]; rej(new Error("Falha ao carregar " + src)); }; document.head.appendChild(s); });
}

export function blobToDataURL(blob) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); }); }
export async function dataURLToBlob(u) { return (await fetch(u)).blob(); }

export function waLink(phone, text) {
  const d = String(phone || "").replace(/\D/g, "");
  const num = d ? (d.length <= 11 ? "55" + d : d) : "";
  return `https://wa.me/${num}?text=${encodeURIComponent(text || "")}`;
}

export async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; }
  catch { const a = document.createElement("textarea"); a.value = t; document.body.appendChild(a); a.select(); const ok = document.execCommand("copy"); a.remove(); return ok; }
}

// Compartilha arquivo (iPhone: tela de compartilhar → WhatsApp). Sem suporte: baixa.
export async function shareOrDownload(blob, name, type) {
  const file = new File([blob], name, { type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return "shared"; }
    catch (e) { if (e && e.name === "AbortError") return "cancelled"; }
  }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
  return "downloaded";
}
