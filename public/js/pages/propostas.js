// Lista de propostas com funil por status, busca e paginação
import * as U from "../ui.js";
import * as db from "../db.js";
import * as A from "../acoes.js";
import * as F from "../filtros.js";
import { ic } from "../icones.js";

const FILTROS = [["", "Todas"], ["rascunho", "Rascunho"], ["enviada", "Enviadas"], ["aceita", "Aceitas"], ["recusada", "Recusadas"], ["cliente", "Por cliente"]];

export async function mount(root) {
  const equipe = await db.nomesEquipe().catch(() => ({}));
  let st = sessionStorage.getItem("petlar_filtro_prop") || "", q = "", page = 0, total = 0, items = [];
  root.innerHTML = `<h1 class="pg">Propostas</h1>
    <div class="toolbar"><div class="grow search"><input type="text" id="q" placeholder="Buscar por tutor ou número" autocomplete="off"></div><button class="btn soft small" id="bSel">Selecionar</button></div>
    <div id="fbar"></div>
    <div class="chips" id="fil">${FILTROS.map(([k, t]) => `<button class="chip" data-v="${k}">${t}</button>`).join("")}</div>
    <div id="funil" class="muted" style="margin:-4px 0 10px"></div>
    <div id="lista">${U.skeleton(5)}</div><div class="more" id="more"></div>
    <a class="btn primary fab" id="fabNova" href="#/proposta/nova">+ Nova proposta</a>
    <div class="lote hide" id="lote"><span id="loteN">0 selecionadas</span>
      <button class="btn small primary" data-lote="aceita">${ic("check")} Aceitaram</button><button class="btn small soft" data-lote="recusada">${ic("x")} Recusaram</button>
      <button class="btn small soft" data-lote="expirada">${ic("relogio")} Sem resposta</button><button class="btn small soft" data-lote="sair">Cancelar</button></div>`;
  let modoSel = false; const sel = new Set();
  const filtros = F.criar(U.$("#fbar", root), { chave: "propostas", aoMudar: () => { load(); funil(); }, campos: [
    { k: "criado", rotulo: "Feita em", tipo: "periodo", presets: ["hoje", "ult7", "mes", "mesPassado", "ult30", "ano"], dica: "Data em que o orçamento foi criado" },
    { k: "servicoData", rotulo: "Data do serviço", tipo: "periodo", presets: ["prox7", "mes", "proxMes", "mesPassado", "ano"], dica: "Serviços que acontecem dentro do período" },
    { k: "servicos", rotulo: "Serviço", tipo: "opcoes", opcoes: Object.entries(U.SERVICOS) },
    { k: "cidades", rotulo: "Cidade", tipo: "opcoes", opcoes: [["Balneário Camboriú", "Balneário Camboriú"], ["Itajaí", "Itajaí"], ["Camboriú", "Camboriú"]] },
    { k: "valor", rotulo: "Valor", tipo: "faixa" },
    ...(Object.keys(equipe).length > 1 ? [{ k: "autores", rotulo: "Quem fez", tipo: "opcoes", opcoes: Object.entries(equipe).map(([e, n]) => [e, n]) }] : []),
  ] });
  const fAtual = () => { const v = filtros.valores; return { criado: filtros.periodo("criado"), servicoData: filtros.periodo("servicoData"), servicos: v.servicos, cidades: v.cidades, valor: v.valor, autores: v.autores }; };
  const syncChips = () => U.$$("#fil .chip", root).forEach(c => c.classList.toggle("on", c.dataset.v === st));
  syncChips();

  const autor = p => { const e = String(p.criado_por || "").toLowerCase(); return e && Object.keys(equipe).length > 1 ? (equipe[e] || e.split("@")[0]) : ""; };
  const row = p => { const pets = A.nomesPets(p).join(", ");
    return `<div class="pwrap ${sel.has(p.id) ? "sel" : ""}" data-pid="${p.id}"><a class="item" href="#/proposta/${p.id}">
    ${modoSel ? `<span class="ck" aria-hidden="true">${sel.has(p.id) ? ic("marcado") : ic("vazio")}</span>` : ""}
    <div class="main"><div class="t">${U.esc(p.tutor_nome || "Sem tutor")} <span class="muted" style="font-weight:400">· ${U.esc(p.numero || "")}</span></div>
    <div class="s">${U.svcPill(p.servico)} ${U.esc(U.periodo(p.data_inicio, p.data_fim) || "sem data")}${pets ? " · " + U.esc(pets) : ""}${Array.isArray(p.opcoes) ? " · 2 opções" : ""}${p.status === "enviada" && p.cobrancas ? ` · cobrada ${p.cobrancas}×` : ""}${autor(p) ? ` · <span class="autor">por ${U.esc(autor(p))}</span>` : ""}</div></div>
    <div class="r"><div class="v">${U.brl(p.valor_total)}</div>${U.pill(p.status)}</div></a>${modoSel ? "" : A.botoes(p)}</div>`; };
  const pintar = () => { if (st === "cliente") return; U.$("#lista", root).innerHTML = items.length ? `<div class="list">${items.map(row).join("")}</div>`
        : `<div class="empty">${q || filtros.ativos() ? "Nada encontrado com essa busca ou filtro." : "Nenhuma proposta aqui ainda."}<br>${filtros.ativos() ? `<button class="btn soft" id="bLimpaF">Limpar filtros</button>` : `<a class="btn primary" href="#/proposta/nova">Criar proposta</a>`}</div>`;
    const lf = U.$("#bLimpaF", root); if (lf) lf.onclick = () => { filtros.limpar(); load(); funil(); }; };

  async function porCliente() {
    U.$("#lista", root).innerHTML = U.skeleton(5); U.$("#more", root).innerHTML = "";
    const myQ = q;
    try {
      let gs = await db.propostasPorCliente(); if (myQ !== q || st !== "cliente") return;
      if (q) gs = gs.filter(x => x.nome.toLowerCase().includes(q.toLowerCase()));
      if (filtros.ativos()) U.$("#more", root).innerHTML = `<p class="muted">Na visão por cliente os filtros não se aplicam.</p>`;
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
      const r = await db.listPropostas({ status: st || null, q: q || null, page, f: fAtual() });
      if (myQ !== q || mySt !== st) return; // resposta antiga
      items = items.concat(r.data); total = r.count;
      pintar();
      U.$("#more", root).innerHTML = items.length < total ? `<button class="btn soft" id="bMore">Carregar mais (${total - items.length})</button>` : "";
      const b = U.$("#bMore", root); if (b) b.addEventListener("click", () => { page++; b.disabled = true; load(false); });
    } catch (e) { U.$("#lista", root).innerHTML = `<div class="empty">Não consegui carregar. <button class="btn soft" id="retry">Tentar de novo</button></div>`; U.$("#retry", root).onclick = () => load(); }
  }
  async function funil() {
    const f = fAtual(); const cont = await Promise.all(["enviada", "aceita", "recusada"].map(s => db.contarStatus(s, f))).catch(() => null);
    if (!cont) return; const [e, a, r] = cont; const resp = a + r;
    U.$("#funil", root).innerHTML = `${filtros.ativos() ? "Com os filtros: " : ""}Enviadas aguardando: <b>${e}</b> · Aceitas: <b>${a}</b> · Recusadas: <b>${r}</b>${resp ? ` · Taxa de aceite: <b>${Math.round(a / resp * 100)}%</b>` : ""}`;
  }
  U.$("#fil", root).addEventListener("click", e => { const c = e.target.closest(".chip"); if (!c) return; st = c.dataset.v; sessionStorage.setItem("petlar_filtro_prop", st); syncChips(); load(); });
  U.$("#lista", root).addEventListener("click", e => { const a = e.target.closest("[data-busca]"); if (!a) return; e.preventDefault(); st = ""; sessionStorage.setItem("petlar_filtro_prop", st); syncChips(); q = a.dataset.busca; U.$("#q", root).value = q; load(); });
  // ações rápidas em cada linha
  A.ligar(U.$("#lista", root), id => items.find(x => x.id === id), () => { pintar(); funil(); });
  // seleção para mudar várias de uma vez
  const syncLote = () => { U.$("#lote", root).classList.toggle("hide", !modoSel); U.$("#fabNova", root).classList.toggle("hide", modoSel); U.$("#loteN", root).textContent = `${sel.size} selecionada${sel.size === 1 ? "" : "s"}`; U.$("#bSel", root).textContent = modoSel ? "Cancelar seleção" : "Selecionar"; };
  const sairSel = () => { modoSel = false; sel.clear(); syncLote(); pintar(); };
  U.$("#bSel", root).addEventListener("click", () => { if (modoSel) return sairSel(); if (st === "cliente") { st = ""; syncChips(); load(); } modoSel = true; syncLote(); pintar(); });
  U.$("#lista", root).addEventListener("click", e => {
    if (!modoSel) return; const w = e.target.closest(".pwrap"); if (!w) return; e.preventDefault();
    const id = w.dataset.pid; sel.has(id) ? sel.delete(id) : sel.add(id); syncLote(); pintar();
  }, true);
  U.$("#lote", root).addEventListener("click", async e => {
    const b = e.target.closest("[data-lote]"); if (!b) return; const st2 = b.dataset.lote;
    if (st2 === "sair") return sairSel();
    if (!sel.size) { U.toast("Toque nas propostas para selecionar."); return; }
    const escolhidas = items.filter(p => sel.has(p.id));
    const soma = escolhidas.reduce((a, p) => a + Number(p.valor_total || 0), 0);
    const txt = { aceita: `Marcar ${sel.size} como aceitas (${U.brl(soma)})? Cada uma lança sinal e saldo no Financeiro.${escolhidas.some(p => Array.isArray(p.opcoes)) ? " As de duas opções ficam com a recomendada." : ""}`, recusada: `Marcar ${sel.size} como recusadas?`, expirada: `Marcar ${sel.size} como sem resposta (expiradas)?` }[st2];
    if (!(await U.confirmDialog(txt, { ok: "Confirmar" }))) return;
    try { await db.statusEmLote([...sel], st2); escolhidas.forEach(p => p.status = st2); db.invalidate("lista"); U.toast(`${sel.size} proposta${sel.size > 1 ? "s" : ""} atualizada${sel.size > 1 ? "s" : ""}`); sairSel(); funil(); window.dispatchEvent(new Event("petlar:propostas")); }
    catch { U.toast("Não consegui atualizar. Confira a internet."); }
  });
  U.$("#q", root).addEventListener("input", U.debounce(e => { q = e.target.value.trim(); load(); }, 300));
  load(); funil();
}
