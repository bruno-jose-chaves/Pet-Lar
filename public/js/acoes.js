// Ações rápidas sobre propostas, sem abrir a proposta: aceitar, recusar, cobrar no WhatsApp, adiar.
// Usado em Propostas, Cobrar e Hoje.
import * as U from "./ui.js";
import * as db from "./db.js";
import { ic } from "./icones.js";

// Separa as enviadas em: cobrar agora, recém-enviadas, adiadas e antigas (sem resposta há muito tempo)
export function agrupar(todas, fu = 2, exp = 15) {
  const hoje = U.today(); const g = { agora: [], recentes: [], adiadas: [], antigas: [] };
  for (const p of todas.filter(x => x.status === "enviada")) {
    const dEnvio = U.diasDesde(p.enviada_em) ?? 0; const dUlt = U.diasDesde(p.cobrada_em || p.enviada_em) ?? 0;
    if (p.lembrar_em && p.lembrar_em > hoje) g.adiadas.push(p);
    else if (dEnvio >= exp) g.antigas.push(p);
    else if (dUlt >= fu || (p.lembrar_em && p.lembrar_em <= hoje)) g.agora.push(p);
    else g.recentes.push(p);
  }
  g.adiadas.sort((a, b) => a.lembrar_em.localeCompare(b.lembrar_em));
  return g;
}

export const nomesPets = p => (p.proposta_pets || []).map(x => x.pets?.nome).filter(Boolean);
const primeiroNome = s => (s || "").trim().split(/\s+/)[0] || "";

// Mensagem de cobrança: o tom muda conforme quantas vezes já cobrou
export function msgCobranca(p) {
  const n = (p.cobrancas || 0) + 1;
  const oi = `Oi${p.tutor_nome ? ", " + primeiroNome(p.tutor_nome) : ""}!`;
  const pets = nomesPets(p); const quem = pets.length ? pets.join(" e ") : "seu pet";
  const quando = p.data_inicio ? ` (${U.periodo(p.data_inicio, p.data_fim)})` : "";
  const num = p.numero ? ` ${p.numero}` : "";
  if (n === 1) return `${oi} Tudo bem? 🐾\n\nPassando para saber se deu para ver a proposta${num} para ${quem}${quando}. Ficou alguma dúvida? Se quiser, já deixo as datas reservadas 😊`;
  if (n === 2) return `${oi} 🐾\n\nAs datas${quando || " que você pediu"} estão bem procuradas por aqui. Quer que eu segure para ${quem}? É só confirmar com o sinal que fica garantido 💛`;
  return `${oi} 🐾\n\nVou liberar na agenda as datas da proposta${num}. Se ainda tiver interesse, me chama que eu vejo se ainda tenho disponibilidade. Obrigada!`;
}

// Botões de uma linha. "compacto" = só ícones (lista de Propostas no celular)
export function botoes(p, { cobrar = true } = {}) {
  if (p.status !== "enviada" && p.status !== "rascunho") return "";
  const zap = cobrar && p.status === "enviada"
    ? `<a class="qa-b zap" data-qa="cobrar" data-id="${p.id}" href="${U.waLink(p.tutores?.whatsapp, msgCobranca(p))}" target="_blank" rel="noopener">${ic("conversa")} Cobrar${p.cobrancas ? ` (${p.cobrancas + 1}ª)` : ""}</a>` : "";
  return `<div class="qa" data-qa-row="${p.id}">
    <button class="qa-b ok" data-qa="aceita" data-id="${p.id}">${ic("check")} Aceitou</button>
    <button class="qa-b no" data-qa="recusada" data-id="${p.id}">${ic("x")} Recusou</button>
    ${zap}
    ${p.status === "enviada" ? `<button class="qa-b" data-qa="adiar" data-id="${p.id}">${ic("relogio")} Adiar</button>` : ""}
  </div>`;
}

// Opções de uma proposta com duas opções (resumo salvo pelo editor)
function opcoesDe(p, payload) {
  const ops = Array.isArray(p.opcoes) ? p.opcoes : Array.isArray(payload?.opcoes) ? payload.opcoes : null;
  return ops && ops.length === 2 ? ops : null;
}

function escolherOpcao(p, ops) {
  return new Promise(res => {
    const pr = Number(p.escolhida) || 1;
    const m = U.modal(`<h3>Qual opção ${U.esc(p.tutor_nome || "o cliente")} aceitou?</h3>
      <div class="acts">${ops.map(o => `<button class="btn ${o.n === pr ? "primary" : "soft"}" data-n="${o.n}">Opção ${o.n}: ${U.esc(o.titulo || U.SERVICOS[o.servico] || "")} · ${U.brl(o.valor_total)}</button>`).join("")}
      <button class="btn soft" data-close>Cancelar</button></div>`, { onClose: () => res(null) });
    m.el.addEventListener("click", e => { const b = e.target.closest("[data-n]"); if (!b) return; const n = Number(b.dataset.n); res(ops.find(o => o.n === n)); m.close(); });
  });
}

// Aceitar: confirma, escolhe a opção (se houver duas) e grava valores + status numa atualização só
export async function aceitar(p) {
  let row = { status: "aceita" }, petIds = null;
  const ops = opcoesDe(p);
  if (ops) {
    const o = await escolherOpcao(p, ops); if (!o) return false;
    const payload = await db.getPayload(p.id); payload.escolhida = o.n;
    row = { status: "aceita", servico: o.servico, valor_total: o.valor_total, valor_cheio: Math.max(o.valor_cheio || 0, o.valor_total), payload };
    if (o.data_inicio) Object.assign(row, { data_inicio: o.data_inicio, data_fim: o.data_fim || o.data_inicio });
    p.valor_total = o.valor_total; if (o.pet_ids?.length) petIds = o.pet_ids; // C-05: só os pets da opção escolhida
  } else {
    const ok = await U.confirmDialog(`${p.tutor_nome || "Cliente"} aceitou a proposta ${p.numero || ""} de ${U.brl(p.valor_total)}? O sinal e o saldo (50/50) vão para o Financeiro.`, { ok: "Sim, aceitou" });
    if (!ok) return false;
  }
  await db.atualizarProposta(p.id, row); if (petIds) await db.setPropostaPets(p.id, petIds); db.invalidate("lista");
  U.toast(`Aceita! Sinal de ${U.brl(Number(p.valor_total) / 2)} lançado no Financeiro.`, 4000);
  return true;
}

// Liga os cliques de uma lista. getP(id) devolve a proposta; depois(p, acao) atualiza a tela.
export function ligar(container, getP, depoisTela) {
  const depois = (p, acao) => { depoisTela(p, acao); window.dispatchEvent(new Event("petlar:propostas")); };
  container.addEventListener("click", async e => {
    const b = e.target.closest("[data-qa]"); if (!b) return;
    const p = getP(b.dataset.id); if (!p) return;
    const acao = b.dataset.qa;
    if (acao === "cobrar") { // o link abre o WhatsApp; aqui só registra a cobrança
      const set = await db.getSettings().catch(() => ({}));
      const n = (p.cobrancas || 0) + 1; const lembrar = U.addDays(U.today(), set.follow_up_dias || 2);
      try { await db.registrarCobranca(p.id, n, lembrar); Object.assign(p, { cobrancas: n, cobrada_em: new Date().toISOString(), lembrar_em: lembrar }); U.toast(`Cobrança ${n} registrada. Lembro de novo em ${U.fmt(lembrar)}.`); depois(p, acao); }
      catch { U.toast("Abri o WhatsApp, mas não consegui registrar a cobrança."); }
      return;
    }
    e.preventDefault();
    b.disabled = true;
    try {
      if (acao === "aceita") { if (await aceitar(p)) { p.status = "aceita"; depois(p, acao); } }
      else if (acao === "recusada") {
        const antes = p.status; p.status = "recusada"; depois(p, acao);
        try { await db.atualizarProposta(p.id, { status: "recusada" }); db.invalidate("lista"); }
        catch { p.status = antes; depois(p, "erro"); U.toast("Não consegui mudar. Confira a internet."); return; }
        U.toastAcao(`${p.tutor_nome || "Proposta"}: recusada`, "Desfazer", async () => {
          await db.atualizarProposta(p.id, { status: antes }); p.status = antes; db.invalidate("lista"); depois(p, "desfeito"); U.toast("Desfeito");
        });
      }
      else if (acao === "adiar") {
        const d = await escolherAdiar(); if (!d) return;
        await db.atualizarProposta(p.id, { lembrar_em: d }); p.lembrar_em = d; db.invalidate("lista");
        U.toast(`Combinado: lembro de cobrar em ${U.fmtY(d)}.`); depois(p, acao);
      }
    } finally { b.disabled = false; }
  });
}

function escolherAdiar() {
  return new Promise(res => {
    const op = [[1, "Amanhã"], [3, "Daqui a 3 dias"], [7, "Daqui a 1 semana"], [15, "Daqui a 15 dias"]];
    const m = U.modal(`<h3>Lembrar de cobrar quando?</h3><div class="acts">${op.map(([d, t]) => `<button class="btn soft" data-d="${d}">${t} · ${U.fmt(U.addDays(U.today(), d))}</button>`).join("")}
      <label class="f" style="margin-top:6px">Outra data<input type="date" id="adOutra" min="${U.addDays(U.today(), 1)}"></label>
      <button class="btn primary" data-outra>Usar a data escolhida</button><button class="btn soft" data-close>Cancelar</button></div>`, { onClose: () => res(null) });
    m.el.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.d) { res(U.addDays(U.today(), Number(b.dataset.d))); m.close(); }
      else if (b.dataset.outra !== undefined) { const v = m.el.querySelector("#adOutra").value; if (!v) { U.toast("Escolha a data."); return; } res(v); m.close(); }
    });
  });
}
