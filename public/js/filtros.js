// Barra de filtros padrão: botão "Filtros", etiquetas removíveis e uma janela com os campos.
// A escolha fica salva no aparelho (por tela). Períodos como "este mês" são recalculados a cada dia.
import * as U from "./ui.js";
import { ic } from "./icones.js";

const hoje = () => U.today();
const iniMes = (d, k = 0) => { const x = U.pd(d); return U.iso(new Date(x.getFullYear(), x.getMonth() + k, 1)); };
const fimMes = (d, k = 0) => { const x = U.pd(d); return U.iso(new Date(x.getFullYear(), x.getMonth() + k + 1, 0)); };
export const PERIODOS = {
  hoje: { t: "Hoje", r: () => [hoje(), hoje()] },
  ult7: { t: "Últimos 7 dias", r: () => [U.addDays(hoje(), -6), hoje()] },
  prox7: { t: "Próximos 7 dias", r: () => [hoje(), U.addDays(hoje(), 6)] },
  mes: { t: "Este mês", r: () => [iniMes(hoje()), fimMes(hoje())] },
  mesPassado: { t: "Mês passado", r: () => [iniMes(hoje(), -1), fimMes(hoje(), -1)] },
  proxMes: { t: "Próximo mês", r: () => [iniMes(hoje(), 1), fimMes(hoje(), 1)] },
  ult30: { t: "Últimos 30 dias", r: () => [U.addDays(hoje(), -29), hoje()] },
  ano: { t: "Este ano", r: () => [hoje().slice(0, 4) + "-01-01", hoje().slice(0, 4) + "-12-31"] },
};
// {p:"mes"} ou {de,ate} → {ini, fim} (qualquer lado pode faltar)
export function intervalo(v) {
  if (!v) return null;
  if (v.p && PERIODOS[v.p]) { const [ini, fim] = PERIODOS[v.p].r(); return { ini, fim }; }
  if (v.de || v.ate) return { ini: v.de || null, fim: v.ate || null };
  return null;
}
const vazio = v => v == null || v === "" || (Array.isArray(v) && !v.length) || (typeof v === "object" && !Array.isArray(v) && !Object.values(v).some(x => x !== "" && x != null));

function rotuloValor(c, v) {
  if (c.tipo === "periodo") return v.p ? PERIODOS[v.p].t : [v.de && "de " + U.fmt(v.de), v.ate && "até " + U.fmt(v.ate)].filter(Boolean).join(" ");
  if (c.tipo === "opcoes") return v.map(x => (c.opcoes.find(o => o[0] === x) || [x, x])[1]).join(", ");
  if (c.tipo === "faixa") return v.min && v.max ? `${U.brl(v.min)} a ${U.brl(v.max)}` : v.min ? `a partir de ${U.brl(v.min)}` : `até ${U.brl(v.max)}`;
  return String(v);
}

/**
 * criar(el, { chave, campos, aoMudar })
 * campos: [{ k, rotulo, tipo: "periodo"|"opcoes"|"faixa"|"texto", opcoes:[[valor,texto]], presets:["mes",…], dica }]
 */
export function criar(el, { chave, campos, aoMudar }) {
  const LS = "petlar_f_" + chave;
  let val = {}; try { val = JSON.parse(localStorage.getItem(LS) || "{}") || {}; } catch { val = {}; }
  const salvar = () => { try { localStorage.setItem(LS, JSON.stringify(val)); } catch { } };
  const ativos = () => campos.filter(c => !vazio(val[c.k]));

  function pintar() {
    const at = ativos();
    el.innerHTML = `<div class="fbar"><button class="btn soft small fbtn ${at.length ? "on" : ""}" type="button" data-fabrir>${ic("filtro")} Filtros${at.length ? ` · ${at.length}` : ""}</button>
      ${at.map(c => `<button class="ftag" type="button" data-ftira="${c.k}" title="Tirar filtro">${U.esc(c.rotulo)}: ${U.esc(rotuloValor(c, val[c.k]))} ${ic("x")}</button>`).join("")}
      ${at.length > 1 ? `<button class="ftag limpar" type="button" data-flimpar>Limpar tudo</button>` : ""}</div>`;
  }
  function abrir() {
    const rascunho = JSON.parse(JSON.stringify(val));
    const campoHTML = c => {
      const v = rascunho[c.k];
      if (c.tipo === "periodo") return `<div class="fcampo" data-c="${c.k}"><b>${U.esc(c.rotulo)}</b>${c.dica ? `<small class="muted">${U.esc(c.dica)}</small>` : ""}
        <div class="chips">${(c.presets || ["mes", "mesPassado", "ult30", "ano"]).map(p => `<button type="button" class="chip ${v?.p === p ? "on" : ""}" data-per="${p}">${PERIODOS[p].t}</button>`).join("")}</div>
        <div class="row"><label class="f">De<input type="date" data-de value="${v?.de || ""}"></label><label class="f">Até<input type="date" data-ate value="${v?.ate || ""}"></label></div></div>`;
      if (c.tipo === "opcoes") return `<div class="fcampo" data-c="${c.k}"><b>${U.esc(c.rotulo)}</b>${c.dica ? `<small class="muted">${U.esc(c.dica)}</small>` : ""}
        <div class="chips">${c.opcoes.map(([o, t]) => `<button type="button" class="chip ${(v || []).includes(o) ? "on" : ""}" data-op="${U.esc(o)}">${U.esc(t)}</button>`).join("")}</div></div>`;
      if (c.tipo === "faixa") return `<div class="fcampo" data-c="${c.k}"><b>${U.esc(c.rotulo)}</b><div class="row"><label class="f">Mínimo (R$)<input type="number" min="0" step="10" data-min value="${v?.min || ""}"></label><label class="f">Máximo (R$)<input type="number" min="0" step="10" data-max value="${v?.max || ""}"></label></div></div>`;
      return `<div class="fcampo" data-c="${c.k}"><label class="f"><b>${U.esc(c.rotulo)}</b><input type="text" data-txt value="${U.esc(v || "")}" placeholder="${U.esc(c.dica || "")}"></label></div>`;
    };
    const m = U.modal(`<h3>Filtros</h3><div class="fcampos">${campos.map(campoHTML).join("")}</div>
      <div class="acts"><button class="btn primary" data-aplicar>Aplicar</button><button class="btn soft" data-zerar>Limpar filtros</button><button class="btn soft" data-close>Cancelar</button></div>`);
    m.el.classList.add("fmodal");
    m.el.addEventListener("click", e => {
      const box = e.target.closest("[data-c]"); const c = box && campos.find(x => x.k === box.dataset.c);
      const per = e.target.closest("[data-per]");
      if (per && c) { const on = rascunho[c.k]?.p === per.dataset.per; rascunho[c.k] = on ? null : { p: per.dataset.per };
        box.querySelectorAll("[data-per]").forEach(b => b.classList.toggle("on", !on && b === per)); box.querySelector("[data-de]").value = ""; box.querySelector("[data-ate]").value = ""; return; }
      const op = e.target.closest("[data-op]");
      if (op && c) { const a = new Set(rascunho[c.k] || []); a.has(op.dataset.op) ? a.delete(op.dataset.op) : a.add(op.dataset.op); rascunho[c.k] = [...a]; op.classList.toggle("on"); return; }
      if (e.target.closest("[data-zerar]")) { val = {}; salvar(); m.close(); pintar(); aoMudar(); return; }
      if (e.target.closest("[data-aplicar]")) { val = rascunho; Object.keys(val).forEach(k => vazio(val[k]) && delete val[k]); salvar(); m.close(); pintar(); aoMudar(); }
    });
    m.el.addEventListener("input", e => {
      const box = e.target.closest("[data-c]"); const c = box && campos.find(x => x.k === box.dataset.c); if (!c) return;
      if (c.tipo === "periodo") { rascunho[c.k] = { de: box.querySelector("[data-de]").value, ate: box.querySelector("[data-ate]").value }; box.querySelectorAll("[data-per]").forEach(b => b.classList.remove("on")); }
      else if (c.tipo === "faixa") rascunho[c.k] = { min: Number(box.querySelector("[data-min]").value) || "", max: Number(box.querySelector("[data-max]").value) || "" };
      else if (c.tipo === "texto") rascunho[c.k] = e.target.value.trim();
    });
  }
  el.addEventListener("click", e => {
    if (e.target.closest("[data-fabrir]")) return abrir();
    const t = e.target.closest("[data-ftira]"); if (t) { delete val[t.dataset.ftira]; salvar(); pintar(); aoMudar(); return; }
    if (e.target.closest("[data-flimpar]")) { val = {}; salvar(); pintar(); aoMudar(); }
  });
  pintar();
  return { get valores() { return val; }, ativos: () => ativos().length, periodo: k => intervalo(val[k]), limpar() { val = {}; salvar(); pintar(); } };
}

// ajuda para filtrar listas na tela
export const dentro = (d, iv) => !iv || (!!d && (!iv.ini || d >= iv.ini) && (!iv.fim || d <= iv.fim));
export const sobrepoe = (a, b, iv) => !iv || (!!a && (!iv.fim || a <= iv.fim) && (!iv.ini || (b || a) >= iv.ini));
