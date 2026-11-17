// Cobrar resposta: quem recebeu orçamento e ainda não respondeu, com cobrança no WhatsApp e lembretes
import * as U from "../ui.js";
import * as db from "../db.js";
import * as A from "../acoes.js";

const JANELA = 7; // mostra serviços dos próximos 7 dias; "agora" = faltam {reconfirmar_dias} dias ou menos

export async function mount(root) {
  root.innerHTML = `<h1 class="pg">Respostas</h1>
    <p class="muted" style="margin-top:-6px">Orçamentos enviados que ainda não tiveram resposta, e quem recusou mas o serviço está chegando. Toque em <b>Cobrar</b> ou <b>Chamar</b> para abrir o WhatsApp com a mensagem pronta. Fica registrado e eu lembro de novo depois.</p>
    <div id="cb">${U.skeleton(4)}</div>`;
  let set = {}, todas = [], rec = [];
  try { [set, todas] = await Promise.all([db.getSettings(), db.propostasEnviadas()]);
    rec = await db.propostasParaReconfirmar(U.today(), U.addDays(U.today(), JANELA)).catch(() => []); }
  catch { U.$("#cb", root).innerHTML = `<div class="empty">Não consegui carregar. Confira a internet.</div>`; return; }
  const fu = set.follow_up_dias || 2, exp = set.expira_dias || 15, fuSeg = set.follow_up_dias_seg || 3, rDias = set.reconfirmar_dias ?? 2;

  const grupos = () => A.agrupar(todas, fu, exp, fuSeg);
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

  const linhaRec = p => {
    const d = Math.round((new Date(p.data_inicio + "T12:00") - new Date(U.today() + "T12:00")) / 864e5);
    const st = p.status === "enviada" ? "ainda sem resposta" : p.status === "recusada" ? "recusou" : "venceu sem resposta";
    return `<div class="pwrap" data-pid="${p.id}"><a class="item" href="#/proposta/${p.id}">
      <div class="main"><div class="t">${U.esc(p.tutor_nome || "Sem tutor")} <span class="muted" style="font-weight:400">· ${U.esc(A.nomesPets(p).join(", "))}</span></div>
      <div class="s">${U.svcPill(p.servico)} ${U.esc(U.periodo(p.data_inicio, p.data_fim))} · ${d <= 0 ? "começa hoje" : d === 1 ? "começa amanhã" : `começa em ${d} dias`}</div>
      <div class="s" style="white-space:normal">${st}${p.tutores?.whatsapp ? "" : " · <b>sem WhatsApp cadastrado</b>"}</div></div>
      <div class="r"><div class="v">${U.brl(p.valor_total)}</div></div></a>${A.botoesReconfirmar(p)}</div>`;
  };
  const recAtivas = () => rec.filter(p => !p.reconfirmada_em && p.status !== "aceita");
  function pintar() {
    const g = grupos(); const R = recAtivas();
    U.$("#cb", root).innerHTML = `
      <div class="kpis" style="margin-bottom:6px">
        <div class="kpi ${g.agora.length ? "alert" : ""}"><span>Cobrar agora</span><b>${g.agora.length}</b><small>${U.brl(g.agora.reduce((a, p) => a + Number(p.valor_total || 0), 0))}</small></div>
        <div class="kpi"><span>Aguardando</span><b>${g.recentes.length + g.adiadas.length}</b><small>enviadas há pouco ou adiadas</small></div>
        <div class="kpi"><span>Sem resposta há ${exp}+ dias</span><b>${g.antigas.length}</b></div>
      </div>
      ${R.length ? `<h2 class="sec">Reconfirmar perto da data <span class="count">${R.length}</span></h2>
        <p class="muted" style="margin:-4px 0 8px">Quem recusou ou não respondeu, mas o serviço é nos próximos ${JANELA} dias. Vale chamar uns ${rDias} dias antes para saber se deu certo com outra pessoa.</p>
        <div class="list">${R.map(linhaRec).join("")}</div>` : ""}
      ${sec("Cobrar agora", g.agora, "Ninguém para cobrar agora.")}
      ${sec("Enviadas há pouco", g.recentes, `Nada enviado nos últimos ${fu} dias.`)}
      ${g.adiadas.length ? sec("Adiadas", g.adiadas, "") : ""}
      ${g.antigas.length ? sec(`Sem resposta há mais de ${exp} dias`, g.antigas, "", `<div class="row-actions" style="margin:-4px 0 8px"><button class="btn soft small" id="bExpirar">Marcar todas como sem resposta</button></div>`) : ""}`;
    const bx = U.$("#bExpirar", root);
    if (bx) bx.onclick = async () => {
      const ids = grupos().antigas.map(p => p.id);
      if (!(await U.confirmDialog(`Marcar ${ids.length} proposta${ids.length > 1 ? "s" : ""} como sem resposta (expirada)? Elas saem desta lista.`, { ok: "Marcar" }))) return;
      try { await db.statusEmLote(ids, "expirada"); todas.forEach(p => { if (ids.includes(p.id)) p.status = "expirada"; }); db.invalidate("lista"); U.toast("Marcadas como sem resposta"); pintar(); window.dispatchEvent(new Event("petlar:propostas")); }
      catch { U.toast("Não consegui atualizar."); }
    };
  }
  pintar();
  A.ligar(U.$("#cb", root), id => todas.find(x => x.id === id) || rec.find(x => x.id === id), (p, acao) => { if (acao === "aceita") { rec = rec.filter(x => x.id !== p.id); } pintar(); });
}
