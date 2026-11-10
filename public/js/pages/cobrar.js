// Cobrar resposta: quem recebeu orçamento e ainda não respondeu, com cobrança no WhatsApp e lembretes
import * as U from "../ui.js";
import * as db from "../db.js";
import * as A from "../acoes.js";

export async function mount(root) {
  root.innerHTML = `<h1 class="pg">Cobrar resposta</h1>
    <p class="muted" style="margin-top:-6px">Orçamentos enviados que ainda não tiveram resposta. Toque em <b>Cobrar</b> para abrir o WhatsApp com a mensagem pronta. A cobrança fica registrada e eu lembro de novo depois.</p>
    <div id="cb">${U.skeleton(4)}</div>`;
  let set = {}, todas = [];
  try { [set, todas] = await Promise.all([db.getSettings(), db.propostasEnviadas()]); }
  catch { U.$("#cb", root).innerHTML = `<div class="empty">Não consegui carregar. Confira a internet.</div>`; return; }
  const fu = set.follow_up_dias || 2, exp = set.expira_dias || 15;

  const grupos = () => A.agrupar(todas, fu, exp);
  const linha = p => {
    const pets = A.nomesPets(p).join(", "); const d = U.diasDesde(p.enviada_em);
    const info = [d === null ? "sem data de envio" : d === 0 ? "enviada hoje" : `enviada há ${d} dia${d > 1 ? "s" : ""}`,
      p.cobrancas ? `cobrada ${p.cobrancas}×${p.cobrada_em ? ` (última em ${U.fmt(p.cobrada_em.slice(0, 10))})` : ""}` : "ainda não cobrada",
      p.lembrar_em && p.lembrar_em > U.today() ? `lembrar em ${U.fmt(p.lembrar_em)}` : ""].filter(Boolean).join(" · ");
    return `<div class="pwrap" data-pid="${p.id}"><a class="item" href="#/proposta/${p.id}">
      <div class="main"><div class="t">${U.esc(p.tutor_nome || "Sem tutor")}${pets ? ` <span class="muted" style="font-weight:400">· ${U.esc(pets)}</span>` : ""}</div>
      <div class="s">${U.svcPill(p.servico)} ${U.esc(U.periodo(p.data_inicio, p.data_fim) || "sem data")} · ${U.esc(p.numero || "")}</div>
      <div class="s" style="white-space:normal">${info}${p.tutores?.whatsapp ? "" : " · <b>sem WhatsApp cadastrado</b>"}</div></div>
      <div class="r"><div class="v">${U.brl(p.valor_total)}</div></div></a>${A.botoes(p)}</div>`;
  };
  const sec = (titulo, lista, vazio, extra = "") => `<h2 class="sec">${titulo} <span class="count">${lista.length}</span></h2>${extra}
    ${lista.length ? `<div class="list">${lista.map(linha).join("")}</div>` : `<div class="empty">${vazio}</div>`}`;

  function pintar() {
    const g = grupos();
    U.$("#cb", root).innerHTML = `
      <div class="kpis" style="margin-bottom:6px">
        <div class="kpi ${g.agora.length ? "alert" : ""}"><span>Cobrar agora</span><b>${g.agora.length}</b><small>${U.brl(g.agora.reduce((a, p) => a + Number(p.valor_total || 0), 0))}</small></div>
        <div class="kpi"><span>Aguardando</span><b>${g.recentes.length + g.adiadas.length}</b><small>enviadas há pouco ou adiadas</small></div>
        <div class="kpi"><span>Sem resposta há ${exp}+ dias</span><b>${g.antigas.length}</b></div>
      </div>
      ${sec("Cobrar agora", g.agora, "Ninguém para cobrar agora.")}
      ${sec("Enviadas há pouco", g.recentes, `Nada enviado nos últimos ${fu} dias.`)}
      ${g.adiadas.length ? sec("Adiadas", g.adiadas, "") : ""}
      ${g.antigas.length ? sec(`Sem resposta há mais de ${exp} dias`, g.antigas, "", `<div class="row-actions" style="margin:-4px 0 8px"><button class="btn soft small" id="bExpirar">Marcar todas como sem resposta</button></div>`) : ""}`;
    const bx = U.$("#bExpirar", root);
    if (bx) bx.onclick = async () => {
      const ids = grupos().antigas.map(p => p.id);
      if (!(await U.confirmDialog(`Marcar ${ids.length} proposta${ids.length > 1 ? "s" : ""} como sem resposta (expirada)? Elas saem desta lista.`, { ok: "Marcar" }))) return;
      try { await db.statusEmLote(ids, "expirada"); todas.forEach(p => { if (ids.includes(p.id)) p.status = "expirada"; }); db.invalidate("lista"); U.toast("Pronto"); pintar(); window.dispatchEvent(new Event("petlar:propostas")); }
      catch { U.toast("Não consegui atualizar."); }
    };
  }
  pintar();
  A.ligar(U.$("#cb", root), id => todas.find(x => x.id === id), () => pintar());
}
