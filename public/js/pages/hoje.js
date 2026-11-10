// Tela inicial: números do dia, quem está com a Lari hoje, próximos e follow-ups
import * as U from "../ui.js";
import * as db from "../db.js";
import { gestao } from "../perfil.js";

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
  root.innerHTML = `<h1 class="pg">${saud}! 🐾</h1>
    <div class="kpis" id="kpis">${'<div class="sk sk-kpi"></div>'.repeat(4)}</div>
    <h2 class="sec">Hoje · ${U.fmtY(hoje)} <span class="count" id="cHoje"></span></h2><div id="hoje">${U.skeleton(2)}</div>
    <h2 class="sec">Próximos 7 dias <span class="count" id="cProx"></span></h2><div id="prox">${U.skeleton(2)}</div>
    ${g ? `<h2 class="sec">Propostas sem resposta <span class="count" id="cFu"></span></h2><div id="fu">${U.skeleton(1)}</div>
    <a class="btn primary fab" href="#/proposta/nova">+ Nova proposta</a>` : ""}`;

  const set = await db.getSettings().catch(() => ({ follow_up_dias: 2 }));
  // tudo em paralelo
  const [res, ativos, prox, fus] = await Promise.all([
    db.resumo(hoje).catch(() => null), db.propostasAtivas(hoje).catch(() => []),
    db.propostasProximas(hoje, 7).catch(() => []), g ? db.followUps(set.follow_up_dias || 2).catch(() => []) : [],
  ]);
  const r = res || {};
  U.$("#kpis", root).innerHTML = `
    <a class="kpi" href="#/pets"><span>Serviços hoje</span><b>${r.servicos_hoje ?? "—"}</b><small>${r.hospedados_hoje || 0} hospedado(s)</small></a>
    <a class="kpi" href="#/agenda"><span>Próximos 7 dias</span><b>${r.proximos_7 ?? "—"}</b><small>serviços confirmados</small></a>
    ${g ? `<a class="kpi ${r.follow_up ? "alert" : ""}" href="#/propostas"><span>Aguardando resposta</span><b>${r.aguardando ?? "—"}</b><small>${U.brl(r.aguardando_valor || 0)} em propostas</small></a>
    <a class="kpi" href="#/financeiro"><span>A receber</span><b>${U.brl(r.a_receber || 0)}</b><small>recebido no mês: ${U.brl(r.recebido_mes || 0)}</small></a>` : ""}`;

  const paths = [...ativos, ...prox].flatMap(p => (p.proposta_pets || []).map(x => x.pets?.foto_path)).filter(Boolean);
  const fotos = await db.fotoUrls(paths).catch(() => ({}));
  const svcHoje = p => p.servico === "hosp" ? (p.data_inicio === hoje ? "chega hoje" : p.data_fim === hoje ? "vai embora hoje" : "hospedado") : p.servico === "visitas" ? "visita hoje" : p.servico === "banho" ? "banho" : "rotina";
  U.$("#cHoje", root).textContent = ativos.length;
  U.$("#hoje", root).innerHTML = ativos.length ? `<div class="list">${ativos.map(p => itemProposta(p, fotos, `<span class="pill aceita">${svcHoje(p)}</span>`)).join("")}</div>` : `<div class="empty">Nenhum serviço hoje. Dia de descanso? 😌</div>`;
  U.$("#cProx", root).textContent = prox.length;
  U.$("#prox", root).innerHTML = prox.length ? `<div class="list">${prox.map(p => itemProposta(p, fotos, `<b style="font-size:13px">${U.fmt(p.data_inicio)}</b>`)).join("")}</div>` : `<div class="empty">Nada confirmado para a próxima semana.</div>`;
  if (!g) return;
  U.$("#cFu", root).textContent = fus.length;
  U.$("#fu", root).innerHTML = fus.length ? `<p class="muted" style="margin:-4px 0 8px">Enviadas há mais de ${set.follow_up_dias || 2} dias. Vale um “oi, conseguiu ver?”</p><div class="list">${fus.map(p => {
    const msg = `Oi${p.tutor_nome ? ", " + p.tutor_nome.split(" ")[0] : ""}! Tudo bem? 🐾 Conseguiu ver a proposta ${p.numero} da Pet Lar? Qualquer dúvida estou por aqui!`;
    return `<div class="item"><a href="#/proposta/${p.id}" class="main" style="text-decoration:none"><div class="t">${U.esc(p.tutor_nome || p.numero)}</div><div class="s">${U.esc(p.numero)} · ${U.SERVICOS[p.servico]} · ${U.brl(p.valor_total)} · enviada há ${U.relTime(p.enviada_em)}</div></a>
      <a class="btn wa small" href="${U.waLink(p.tutores?.whatsapp, msg)}" target="_blank" rel="noopener">Lembrar</a></div>`;
  }).join("")}</div>` : `<div class="empty">Nenhuma proposta esperando há muito tempo ✓</div>`;
}
