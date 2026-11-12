// Tela inicial: números do dia, quem está com a Lari hoje, próximos e follow-ups
import * as U from "../ui.js";
import * as db from "../db.js";
import { gestao } from "../perfil.js";
import * as A from "../acoes.js";
import { ic } from "../icones.js";

export function itemProposta(p, fotos = {}, extra = "") {
  const pets = (p.proposta_pets || []).map(x => x.pets).filter(Boolean);
  const f = pets.find(x => x.foto_path && fotos[x.foto_path]);
  const nomes = pets.map(x => x.nome).filter(Boolean).join(", ");
  return `<a class="item" href="#/proposta/${p.id}">
    <div class="av">${f ? `<img src="${fotos[f.foto_path]}" alt="" loading="lazy">` : U.PAW}</div>
    <div class="main"><div class="t">${U.esc(nomes || p.tutor_nome || "Sem nome")}</div>
      <div class="s">${U.svcPill(p.servico)} ${U.esc(U.periodo(p.data_inicio, p.data_fim))}${p.tutor_nome ? " · " + U.esc(p.tutor_nome) : ""}</div></div>
    <div class="r">${extra}</div></a>`;
}

export async function mount(root) {
  const hoje = U.today();
  const g = gestao();
  const h = new Date().getHours(); const saud = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  root.innerHTML = `<h1 class="pg">${saud}!</h1>
    <div class="kpis" id="kpis">${'<div class="sk sk-kpi"></div>'.repeat(4)}</div>
    <div id="anivs"></div>
    ${g ? `<div id="pend"></div>` : ""}
    <h2 class="sec">Hoje · ${U.fmtY(hoje)} <span class="count" id="cHoje"></span></h2><div id="hoje">${U.skeleton(2)}</div>
    <h2 class="sec">Próximos 7 dias <span class="count" id="cProx"></span></h2><div id="prox">${U.skeleton(2)}</div>
    ${g ? `<h2 class="sec">Cobrar resposta <span class="count" id="cFu"></span></h2><div id="fu">${U.skeleton(1)}</div>
    <a class="btn primary fab" href="#/proposta/nova">+ Nova proposta</a>` : ""}`;

  const set = await db.getSettings().catch(() => ({ follow_up_dias: 2 }));
  // tudo em paralelo
  const [res, ativos, prox, fus] = await Promise.all([
    db.resumo(hoje).catch(() => null), db.propostasAtivas(hoje).catch(() => []),
    db.propostasProximas(hoje, 7).catch(() => []), g ? db.propostasEnviadas().catch(() => []) : [],
  ]);
  const r = res || {};
  U.$("#kpis", root).innerHTML = `
    <a class="kpi" href="#/pets"><span>Serviços hoje</span><b>${r.servicos_hoje ?? "—"}</b><small>${r.hospedados_hoje || 0} hospedado(s)</small></a>
    <a class="kpi" href="#/agenda"><span>Próximos 7 dias</span><b>${r.proximos_7 ?? "—"}</b><small>serviços confirmados</small></a>
    ${g ? `<a class="kpi ${r.follow_up ? "alert" : ""}" href="#/cobrar"><span>Aguardando resposta</span><b>${r.aguardando ?? "—"}</b><small>${U.brl(r.aguardando_valor || 0)} em propostas</small></a>
    <a class="kpi" href="#/financeiro"><span>A receber</span><b>${U.brl(r.a_receber || 0)}</b><small>recebido no mês: ${U.brl(r.recebido_mes || 0)}</small></a>` : ""}`;

  const paths = [...ativos, ...prox].flatMap(p => (p.proposta_pets || []).map(x => x.pets?.foto_path)).filter(Boolean);
  const fotos = await db.fotoUrls(paths).catch(() => ({}));
  const svcHoje = p => p.servico === "hosp" ? (p.data_inicio === hoje ? "chega hoje" : p.data_fim === hoje ? "vai embora hoje" : "hospedado") : p.servico === "visitas" ? "visita hoje" : p.servico === "banho" ? "banho" : "rotina";
  U.$("#cHoje", root).textContent = ativos.length;
  U.$("#hoje", root).innerHTML = ativos.length ? `<div class="list">${ativos.map(p => `<div class="pwrap">${itemProposta(p, fotos, `<span class="pill aceita">${svcHoje(p)}</span>`)}<div class="qa"><a class="qa-b diario" href="#/diario/${p.id}">${ic("diario")} Diário de hoje</a></div></div>`).join("")}</div>` : `<div class="empty">Nenhum serviço hoje. Dia de descanso? 😌</div>`;
  U.$("#cProx", root).textContent = prox.length;
  U.$("#prox", root).innerHTML = prox.length ? `<div class="list">${prox.map(p => itemProposta(p, fotos, `<b style="font-size:13px">${U.fmt(p.data_inicio)}</b>`)).join("")}</div>` : `<div class="empty">Nada confirmado para a próxima semana.</div>`;
  if (!g) return;
  const cob = A.agrupar(fus, set.follow_up_dias || 2, set.expira_dias || 15).agora;
  U.$("#cFu", root).textContent = cob.length;
  const linha = p => { const pets = A.nomesPets(p).join(", "); const d = U.diasDesde(p.enviada_em);
    return `<div class="pwrap" data-pid="${p.id}"><a class="item" href="#/proposta/${p.id}"><div class="main"><div class="t">${U.esc(p.tutor_nome || p.numero)}${pets ? ` <span class="muted" style="font-weight:400">· ${U.esc(pets)}</span>` : ""}</div>
      <div class="s">${U.SERVICOS[p.servico]} · ${U.brl(p.valor_total)} · enviada há ${d} dia${d === 1 ? "" : "s"}${p.cobrancas ? ` · cobrada ${p.cobrancas}×` : ""}</div></div></a>${A.botoes(p)}</div>`; };
  const pintar = () => {
    const lista = cob.filter(p => p.status === "enviada" && !(p.lembrar_em && p.lembrar_em > hoje) && !(p.cobrada_em && U.diasDesde(p.cobrada_em) < (set.follow_up_dias || 2)));
    U.$("#cFu", root).textContent = lista.length;
    U.$("#fu", root).innerHTML = lista.length ? `<div class="list">${lista.slice(0, 5).map(linha).join("")}</div><a class="btn soft small" href="#/cobrar" style="margin-top:8px">Ver todas em Cobrar resposta ›</a>`
      : `<div class="empty">Ninguém para cobrar agora. <a href="#/cobrar">Ver enviadas</a></div>`;
  };
  pintar();
  A.ligar(U.$("#fu", root), id => cob.find(x => x.id === id), () => pintar());
  if (g) db.pendencias().then(x => { const n = db.totalPendencias(x); const el = U.$("#pend", root);
    if (el && n) el.innerHTML = `<a class="pend-card" href="#/completar">${ic("marcado")}<span><b>Completar cadastros</b><small>${n} informaç${n === 1 ? "ão" : "ões"} faltando (WhatsApp, fotos, raças, datas)</small></span>${ic("seta")}</a>`; }).catch(() => {});
  db.petsComAniversario().then(ps => {
    const prox = ps.map(p => ({ ...p, em: U.diasAteAniv(p.aniversario) })).filter(p => p.em != null && p.em <= 7).sort((a, b) => a.em - b.em);
    const el = U.$("#anivs", root); if (!el || !prox.length) return;
    el.innerHTML = `<h2 class="sec">Aniversários</h2><div class="list">${prox.map(p => `<a class="item" href="#/pet/${p.id}"><div class="av">${ic("estrela")}</div><div class="main"><div class="t">${U.esc(p.nome || "Pet")}${p.tutores?.nome ? ` <span class="muted" style="font-weight:400">· ${U.esc(p.tutores.nome)}</span>` : ""}</div>
      <div class="s">${p.em === 0 ? "<b>Hoje!</b>" : p.em === 1 ? "Amanhã" : `Em ${p.em} dias`} · ${U.esc(U.anivTexto(p.aniversario))}</div></div>
      ${p.em === 0 && p.tutores?.whatsapp ? `<span class="btn small soft" data-zap="${U.esc(U.waLink(p.tutores.whatsapp, `Oi, ${(p.tutores.nome || "").split(" ")[0]}! Hoje é aniversário ${/a$/i.test(p.nome || "") ? "da" : "do"} ${p.nome}! Muitas felicidades e muitos petiscos para ${/a$/i.test(p.nome || "") ? "ela" : "ele"}. Um beijo da Lari, Pet Lar`))}">${ic("conversa")} Parabéns</span>` : ""}</a>`).join("")}</div>`;
    el.addEventListener("click", e => { const z = e.target.closest("[data-zap]"); if (z) { e.preventDefault(); window.open(z.dataset.zap, "_blank", "noopener"); } });
  }).catch(() => {});
}
