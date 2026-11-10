// Lista de tutores (clientes)
import * as U from "../ui.js";
import * as db from "../db.js";
import { gestao } from "../perfil.js";
import * as F from "../filtros.js";

export async function mount(root) {
  let q = "", page = 0, items = [], total = 0;
  root.innerHTML = `<h1 class="pg">Tutores</h1>
    <div class="toolbar"><div class="grow search"><input type="text" id="q" placeholder="Buscar tutor pelo nome" autocomplete="off"></div></div>
    <div id="fbar"></div>
    <div id="lista">${U.skeleton(5)}</div><div class="more" id="more"></div>
    ${gestao() ? `<a class="btn primary fab" href="#/tutor/novo">+ Novo tutor</a>` : ""}`;
  const G = gestao();
  const filtros = F.criar(U.$("#fbar", root), { chave: "tutores", aoMudar: () => load(), campos: [
    { k: "cidades", rotulo: "Cidade", tipo: "opcoes", opcoes: [["Balneário Camboriú", "Balneário Camboriú"], ["Itajaí", "Itajaí"], ["Camboriú", "Camboriú"]] },
    { k: "bairro", rotulo: "Bairro", tipo: "texto", dica: "Ex.: Centro, Pioneiros" },
    ...(G ? [{ k: "situacao", rotulo: "Situação", tipo: "opcoes", opcoes: [["aceita", "Já fechou serviço"], ["enviada", "Tem orçamento sem resposta"], ["nunca", "Nunca fechou"]], dica: "Mostra quem se encaixa em qualquer um dos marcados" },
      { k: "contato", rotulo: "Último orçamento", tipo: "periodo", presets: ["ult7", "mes", "mesPassado", "ult30", "ano"] }] : []),
    { k: "whats", rotulo: "WhatsApp", tipo: "opcoes", opcoes: [["com", "Com WhatsApp"], ["sem", "Sem WhatsApp"]] },
  ] });
  const passa = t => { const v = filtros.valores; const props = t.propostas || [];
    if (v.cidades?.length && !v.cidades.includes(t.cidade)) return false;
    if (v.bairro && !(t.bairro || "").toLowerCase().includes(v.bairro.toLowerCase())) return false;
    if (v.whats?.length === 1 && (v.whats[0] === "com") !== !!t.whatsapp) return false;
    if (v.situacao?.length && !v.situacao.some(s => s === "nunca" ? !props.some(p => p.status === "aceita") : props.some(p => p.status === s))) return false;
    const iv = filtros.periodo("contato");
    if (iv) { const ult = props.map(p => (p.created_at || "").slice(0, 10)).sort().pop(); if (!F.dentro(ult, iv)) return false; }
    return true; };
  async function load(reset = true) {
    if (reset) { page = 0; items = []; U.$("#lista", root).innerHTML = U.skeleton(5); }
    const myQ = q;
    try {
      const comF = filtros.ativos() > 0;
      const r = await db.listTutores({ q, page: comF ? 0 : page, size: comF ? 1000 : 30, comPropostas: comF && G }); if (myQ !== q) return;
      if (comF) { items = r.data.filter(passa); total = items.length; } else { items = items.concat(r.data); total = r.count; }
      U.$("#lista", root).innerHTML = items.length ? `<div class="list">${items.map(t => `<a class="item" href="#/tutor/${t.id}">
        <div class="av round">${U.USER}</div>
        <div class="main"><div class="t">${U.esc(t.nome)}</div><div class="s">${U.esc([t.whatsapp, t.bairro, t.cidade].filter(Boolean).join(" · "))}</div></div>
        <div class="r muted">${(t.pets || []).length ? "" + (t.pets || []).map(p => U.esc(p.nome || "pet")).join(", ") : ""}</div></a>`).join("")}</div>`
        : `<div class="empty">${q || filtros.ativos() ? "Nenhum tutor com essa busca ou filtro." : "Nenhum tutor ainda. Eles entram sozinhos quando você salva uma proposta."}</div>`;
      U.$("#more", root).innerHTML = items.length < total ? `<button class="btn soft" id="bMore">Carregar mais</button>` : "";
      const b = U.$("#bMore", root); if (b) b.onclick = () => { page++; load(false); };
    } catch { U.$("#lista", root).innerHTML = `<div class="empty">Não consegui carregar.</div>`; }
  }
  U.$("#q", root).addEventListener("input", U.debounce(e => { q = e.target.value.trim(); load(); }, 300));
  load();
}
