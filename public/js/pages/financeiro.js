// Financeiro: a receber, recebido no mês e receita por serviço
import * as U from "../ui.js";
import * as db from "../db.js";

export async function mount(root) {
  const now = new Date(); let ano = now.getFullYear(), mes = now.getMonth();
  root.innerHTML = `<h1 class="pg">Financeiro</h1>
    <div class="kpis" id="kpis">${'<div class="sk sk-kpi"></div>'.repeat(4)}</div>
    <h2 class="sec">A receber <span class="count" id="cAb"></span></h2><div id="abertos">${U.skeleton(3)}</div>
    <div class="cal-head" style="margin-top:22px"><button class="btn soft small" id="prev">‹</button><b id="mesNome"></b><button class="btn soft small" id="next">›</button></div>
    <div class="grid2"><div class="panel"><h3>Recebido no mês</h3><div id="recebidos">${U.skeleton(2)}</div></div><div class="panel"><h3>Serviços fechados no mês</h3><div id="porServ"></div></div></div>`;

  let abertos = [];
  function kpis(rec, servs) {
    const hoje = U.today();
    const vencido = abertos.filter(g => g.vencimento && g.vencimento < hoje).reduce((a, g) => a + Number(g.valor), 0);
    const aReceber = abertos.reduce((a, g) => a + Number(g.valor), 0);
    const recebido = rec.reduce((a, g) => a + Number(g.valor), 0);
    const fechado = servs.reduce((a, p) => a + Number(p.valor_total), 0);
    U.$("#kpis", root).innerHTML = `<div class="kpi"><span>A receber</span><b>${U.brl(aReceber)}</b><small>${abertos.length} parcela(s)</small></div>
      <div class="kpi ${vencido ? "alert" : ""}"><span>Vencido</span><b>${U.brl(vencido)}</b><small>cobrar no WhatsApp</small></div>
      <div class="kpi"><span>Recebido no mês</span><b>${U.brl(recebido)}</b><small>${rec.length} pagamento(s)</small></div>
      <div class="kpi"><span>Fechado no mês</span><b>${U.brl(fechado)}</b><small>${servs.length} serviço(s) · ticket ${U.brl(servs.length ? fechado / servs.length : 0)}</small></div>`;
  }
  function renderAbertos() {
    const hoje = U.today();
    U.$("#cAb", root).textContent = abertos.length;
    U.$("#abertos", root).innerHTML = abertos.length ? `<div class="list">${abertos.map(g => {
      const p = g.propostas || {}; const venc = g.vencimento && g.vencimento < hoje;
      const msg = `Oi${p.tutor_nome ? ", " + p.tutor_nome.split(" ")[0] : ""}! Tudo bem? 🐾 Passando para lembrar do ${g.descricao.toLowerCase()} da proposta ${p.numero}: ${U.brl2(g.valor)}. Obrigada!`;
      return `<div class="item" data-id="${g.id}"><a class="main" href="#/proposta/${g.proposta_id}" style="text-decoration:none"><div class="t">${U.esc(p.tutor_nome || p.numero || "")} · ${U.brl2(g.valor)}</div>
        <div class="s">${U.esc(g.descricao)} · ${U.esc(p.numero || "")} · <span style="${venc ? "color:#A4402A;font-weight:700" : ""}">${venc ? "venceu" : "vence"} ${U.fmt(g.vencimento)}</span></div></a>
        <div class="row-actions">${venc && p.tutores?.whatsapp ? `<a class="btn wa small" href="${U.waLink(p.tutores.whatsapp, msg)}" target="_blank" rel="noopener">Lembrar</a>` : ""}<button class="btn primary small" data-pagar="${g.id}">Recebi</button></div></div>`;
    }).join("")}</div>` : `<div class="empty">Nada a receber ✓</div>`;
  }
  async function loadMes() {
    const ini = U.iso(new Date(ano, mes, 1)), fim = U.iso(new Date(ano, mes + 1, 0));
    U.$("#mesNome", root).textContent = new Date(ano, mes, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).replace(/^./, c => c.toUpperCase());
    const [rec, servs] = await Promise.all([db.pagamentosMes(ini, fim).catch(() => []), db.receitaPorServico(ini, fim).catch(() => [])]);
    kpis(rec, servs);
    U.$("#recebidos", root).innerHTML = rec.length ? `<div class="list">${rec.map(g => `<div class="item" style="background:#fff"><div class="main"><div class="t">${U.brl2(g.valor)} · ${U.esc(g.propostas?.tutor_nome || "")}</div><div class="s">${U.esc(g.descricao)} · ${U.fmt(g.pago_em)}${g.forma ? " · " + g.forma : ""}</div></div><button class="x" data-desfazer="${g.id}">desfazer</button></div>`).join("")}</div>` : `<div class="empty">Nenhum pagamento neste mês.</div>`;
    const by = {}; servs.forEach(p => { by[p.servico] = (by[p.servico] || 0) + Number(p.valor_total); });
    const max = Math.max(1, ...Object.values(by));
    U.$("#porServ", root).innerHTML = Object.keys(by).length ? Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:4px"><span>${U.SERVICOS[k]}</span><b>${U.brl(v)}</b></div><div class="bar"><i style="width:${Math.round(v / max * 100)}%"></i></div></div>`).join("") : `<div class="empty">Nenhum serviço fechado neste mês.</div>`;
  }
  async function load() { abertos = await db.pagamentosAbertos().catch(() => []); renderAbertos(); await loadMes(); }
  const onClick = async e => {
    const pg = e.target.closest("[data-pagar]");
    if (pg) {
      const m = U.modal(`<h3>Como recebeu?</h3><div class="acts"><button class="btn primary" data-f="pix">Pix</button><button class="btn soft" data-f="dinheiro">Dinheiro</button><button class="btn soft" data-f="cartao">Cartão</button><button class="btn soft" data-close>Cancelar</button></div>`);
      m.el.addEventListener("click", async ev => {
        const b = ev.target.closest("[data-f]"); if (!b) return; m.close();
        const id = pg.dataset.pagar; const antes = abertos; abertos = abertos.filter(g => g.id !== id); renderAbertos(); // otimista
        try { await db.marcarPago(id, b.dataset.f); U.toast("Recebido ✓"); loadMes(); } catch { abertos = antes; renderAbertos(); U.toast("Não consegui salvar."); }
      });
      return;
    }
    const d = e.target.closest("[data-desfazer]");
    if (d) { await db.desmarcarPago(d.dataset.desfazer).catch(() => {}); U.toast("Pagamento voltou para “a receber”"); load(); }
  };
  root.addEventListener("click", onClick);
  U.$("#prev", root).onclick = () => { mes--; if (mes < 0) { mes = 11; ano--; } loadMes(); };
  U.$("#next", root).onclick = () => { mes++; if (mes > 11) { mes = 0; ano++; } loadMes(); };
  load();
  return { destroy() { root.removeEventListener("click", onClick); } };
}
