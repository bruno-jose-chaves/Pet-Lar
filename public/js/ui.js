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
export const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
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

export const PAW = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.2 8.5C3.6 9.5 3.2 13 4.3 15.2c1.4-.4 2.2-2.6 2.2-4.8z" fill="#B88A66"/><path d="M18.8 8.5c1.6 1 2 4.5.9 6.7-1.4-.4-2.2-2.6-2.2-4.8z" fill="#B88A66"/><circle cx="12" cy="13" r="6.5" fill="#EBD2B7"/><ellipse cx="12" cy="15.6" rx="3.1" ry="2.4" fill="#F9EFE3"/><ellipse cx="12" cy="14.3" rx="1.3" ry=".9" fill="#5A3B2A"/><circle cx="9.5" cy="11.9" r=".85" fill="#5A3B2A"/><circle cx="14.5" cy="11.9" r=".85" fill="#5A3B2A"/><path d="M12 15.2v1.1M10.6 16.7c.5.5 2.3.5 2.8 0" fill="none" stroke="#5A3B2A" stroke-width=".8" stroke-linecap="round"/></svg>`;
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

// foto quadrada (recorte central) em JPEG, para fotos de pet
export function squareBlob(file, size = 900) {
  return new Promise((res, rej) => {
    const r = new FileReader(); r.onload = () => { const img = new Image(); img.onload = () => {
      const s = Math.min(img.width, img.height); const c = document.createElement("canvas"); c.width = c.height = size; const x = c.getContext("2d");
      x.imageSmoothingQuality = "high"; x.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      c.toBlob(b => res(b), "image/jpeg", .9);
    }; img.onerror = rej; img.src = r.result; }; r.readAsDataURL(file);
  });
}

// ---------- aniversário do pet: 'AAAA-MM-DD', ou '---MM-DD' quando não se sabe o ano (o ano vira '--') ----------
export function anivTexto(v) {
  const m = /^(\d{4}|--)-(\d{2})-(\d{2})$/.exec(v || ""); if (!m) return "";
  const dia = new Date(2000, Number(m[2]) - 1, Number(m[3])).toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
  if (m[1] === "--") return dia;
  const n = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])), h = new Date();
  let meses = (h.getFullYear() - n.getFullYear()) * 12 + h.getMonth() - n.getMonth() - (h.getDate() < n.getDate() ? 1 : 0);
  const idade = meses < 0 ? "" : meses < 12 ? `${meses} ${meses === 1 ? "mês" : "meses"}` : `${Math.floor(meses / 12)} ${Math.floor(meses / 12) === 1 ? "ano" : "anos"}`;
  return `${dia} de ${m[1]}${idade ? ` (${idade})` : ""}`;
}
// dias até o próximo aniversário (0 = hoje)
export function diasAteAniv(v) {
  const m = /^(\d{4}|--)-(\d{2})-(\d{2})$/.exec(v || ""); if (!m) return null;
  const h = new Date(); h.setHours(0, 0, 0, 0);
  let a = new Date(h.getFullYear(), Number(m[2]) - 1, Number(m[3])); if (a < h) a = new Date(h.getFullYear() + 1, Number(m[2]) - 1, Number(m[3]));
  return Math.round((a - h) / 864e5);
}
// campos do formulário: dia, mês e ano (o ano pode ser "não sei")
export function anivCampos(v, nome = "aniv") {
  const m = /^(\d{4}|--)-(\d{2})-(\d{2})$/.exec(v || ""); const ano = m && m[1] !== "--" ? m[1] : "";
  const MES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const y = new Date().getFullYear(), op = (val, txt, sel) => `<option value="${val}"${sel ? " selected" : ""}>${txt}</option>`;
  return `<div class="aniv-sel">
    <select name="${nome}_d" aria-label="Dia">${op("", "Dia", !m)}${Array.from({ length: 31 }, (_, i) => op(String(i + 1).padStart(2, "0"), i + 1, m && Number(m[3]) === i + 1)).join("")}</select>
    <select name="${nome}_m" aria-label="Mês">${op("", "Mês", !m)}${MES.map((t, i) => op(String(i + 1).padStart(2, "0"), t, m && Number(m[2]) === i + 1)).join("")}</select>
    <select name="${nome}_a" aria-label="Ano">${op("", "Não sei o ano", !ano)}${Array.from({ length: 26 }, (_, i) => op(String(y - i), y - i, ano === String(y - i))).join("")}</select></div>`;
}
export function anivDoForm(fd, nome = "aniv") {
  const d = String(fd.get(nome + "_d") || ""), m = String(fd.get(nome + "_m") || ""), a = String(fd.get(nome + "_a") || "");
  if (!d || !m) return null;
  const dt = new Date(Number(a || 2000), Number(m) - 1, Number(d)); if (dt.getDate() !== Number(d)) return null; // ex.: 31 de abril
  return `${a || "--"}-${m}-${d}`;
}
// idade escrita só com número ("4") vira "4 anos"; texto livre ("8 meses") fica como está
export function idadeTxt(v) {
  const t = String(v ?? "").trim(); if (!t) return "";
  const m = /^(\d+)(?:[.,](\d+))?$/.exec(t); if (!m) return t;
  if (m[2]) return `${t.replace(".", ",")} anos`;
  return Number(m[1]) === 1 ? "1 ano" : `${m[1]} anos`;
}
