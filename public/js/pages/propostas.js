// Lista de propostas com funil por status, busca e paginação
import * as U from "../ui.js";
import * as db from "../db.js";

const FILTROS = [["", "Todas"], ["rascunho", "Rascunho"], ["enviada", "Enviadas"], ["aceita", "Aceitas"], ["recusada", "Recusadas"], ["cliente", "👤 Por cliente"]];

export async function mount(root) {
  let st = sessionStorage.getItem("petlar_filtro_prop") || "", q = "", page = 0, total = 0, items = [];
  root.innerHTML = `<h1 class="pg">Propostas</h1>
    <div class="toolbar"><div class="grow search"><input type="text" id="q" placeholder="Buscar por tutor ou número" autocomplete="off"></div></div>
    <div class="chips" id="fil">${FILTROS.map(([k, t]) => `<button class="chip" data-v="${k}">${t}</button>`).join("")}</div>
    <div id="funil" class="muted" style="margin:-4px 0 10px"></div>
    <div id="lista">${U.skeleton(5)}</div><div class="more" id="more"></div>
    <a class="btn primary fab" href="#/proposta/nova">+ Nova proposta</a>`;
  const syncChips = () => U.$$("#fil .chip", root).forEach(c => c.classList.toggle("on", c.dataset.v === st));
  syncChips();

  const row = p => `<a class="item" href="#/proposta/${p.id}">
    <div class="main"><div class="t">${U.esc(p.tutor_nome || "Sem tutor")} <span class="muted" style="font-weight:400">· ${U.esc(p.numero || "")}</span></div>
    <div class="s">${U.svcPill(p.servico)} ${U.esc(U.periodo(p.data_inicio, p.data_fim) || "sem data")}</div></div>
    <div class="r"><div class="v">${U.brl(p.valor_total)}</div>${U.pill(p.status)}</div></a>`;

  async function porCliente() {
    U.$("#lista", root).innerHTML = U.skeleton(5); U.$("#more", root).innerHTML = "";
    const myQ = q;
    try {
      let gs = await db.propostasPorCliente(); if (myQ !== q || st !== "cliente") return;
      if (q) gs = gs.filter(x => x.nome.toLowerCase().includes(q.toLowerCase()));
      U.$("#lista", root).innerHTML = gs.length ? `<p class="muted" style="margin:0 0 8px">Toque no cliente para ver o histórico completo de orçamentos dele.</p><div class="list">${gs.map(x => `<a class="item" href="${x.tutor_id ? "#/tutor/" + x.tutor_id : "#/propostas"}" ${x.tutor_id ? "" : `data-busca="${U.esc(x.nome)}"`}>
        <div class="av round">${U.USER}</div>
        <div class="main"><div class="t">${U.esc(x.nome)}</div><div class="s">${x.total} orçamento${x.total > 1 ? "s" : ""} · ${x.aceitas} aceito${x.aceitas === 1 ? "" : "s"}${x.recusadas ? " · " + x.recusadas + " recusado" + (x.recusadas > 1 ? "s" : "") : ""} · último em ${U.fmtY(x.ultima.slice(0, 10))}</div></div>
        <div class="r"><div class="v">${U.brl(x.valorAceito)}</div><small class="muted">contratado</small></div></a>`).join("")}</div>`
        : `<div class="empty">Nenhum cliente${q ? " com esse nome" : ""}.</div>`;
    } catch { U.$("#lista", root).innerHTML = `<div class="empty">Não consegui carregar.</div>`; }
  }
  async function load(reset = true) {
    if (st === "cliente") return porCliente();
    if (reset) { page = 0; items = []; U.$("#lista", root).innerHTML = U.skeleton(5); }
    const myQ = q, mySt = st;
    try {
      const r = await db.listPropostas({ status: st || null, q: q || null, page });
      if (myQ !== q || mySt !== st) return; // resposta antiga
      items = items.concat(r.data); total = r.count;
      U.$("#lista", root).innerHTML = items.length ? `<div class="list">${items.map(row).join("")}</div>`
        : `<div class="empty">${q ? "Nada encontrado para “" + U.esc(q) + "”." : "Nenhuma proposta aqui ainda."}<br><a class="btn primary" href="#/proposta/nova">Criar proposta</a></div>`;
      U.$("#more", root).innerHTML = items.length < total ? `<button class="btn soft" id="bMore">Carregar mais (${total - items.length})</button>` : "";
      const b = U.$("#bMore", root); if (b) b.addEventListener("click", () => { page++; b.disabled = true; load(false); });
    } catch (e) { U.$("#lista", root).innerHTML = `<div class="empty">Não consegui carregar. <button class="btn soft" id="retry">Tentar de novo</button></div>`; U.$("#retry", root).onclick = () => load(); }
  }
  async function funil() {
    const cont = await Promise.all(["enviada", "aceita", "recusada"].map(s => db.sb.from("propostas").select("id", { count: "exact", head: true }).eq("status", s).then(r => r.count || 0))).catch(() => null);
    if (!cont) return; const [e, a, r] = cont; const resp = a + r;
    U.$("#funil", root).innerHTML = `Enviadas aguardando: <b>${e}</b> · Aceitas: <b>${a}</b> · Recusadas: <b>${r}</b>${resp ? ` · Taxa de aceite: <b>${Math.round(a / resp * 100)}%</b>` : ""}`;
  }
  U.$("#fil", root).addEventListener("click", e => { const c = e.target.closest(".chip"); if (!c) return; st = c.dataset.v; sessionStorage.setItem("petlar_filtro_prop", st); syncChips(); load(); });
  U.$("#lista", root).addEventListener("click", e => { const a = e.target.closest("[data-busca]"); if (!a) return; e.preventDefault(); st = ""; sessionStorage.setItem("petlar_filtro_prop", st); syncChips(); q = a.dataset.busca; U.$("#q", root).value = q; load(); });
  U.$("#q", root).addEventListener("input", U.debounce(e => { q = e.target.value.trim(); load(); }, 300));
  load(); funil();
}
