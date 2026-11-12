// C-02 · Completar cadastros: tudo o que falta (principalmente nos orçamentos importados) numa tela só,
// com edição ali mesmo: WhatsApp do tutor, nome e raça do pet, foto, cliente e datas das propostas.
import * as U from "../ui.js";
import * as db from "../db.js";
import { ic } from "../icones.js";
import { enquadrar } from "../recorte.js";

const SEC = [
  ["semCliente", "Propostas sem cliente", "Abra e escolha o cliente (ou cadastre)."],
  ["semWhats", "Clientes sem WhatsApp", "Sem o número não dá para mandar orçamento, cobrança nem o link da área do tutor."],
  ["semNome", "Pets sem nome", ""],
  ["semRaca", "Pets sem raça", ""],
  ["semFoto", "Pets sem foto", "A foto aparece no orçamento, no diário e na área do tutor."],
  ["semData", "Orçamentos sem data", "Sem data o serviço não entra na agenda nem no Hoje."],
];

export async function mount(root) {
  root.innerHTML = `<h1 class="pg">Completar cadastros</h1><div class="sk" style="height:120px"></div>`;
  const x = await db.pendencias();
  const total = db.totalPendencias(x);
  const nomeTutor = p => p.tutores?.nome ? ` <span class="muted">· ${U.esc(p.tutores.nome)}</span>` : "";
  const linhas = {
    semCliente: p => `<a class="item" href="#/proposta/${p.id}"><div class="main"><div class="t">${U.esc(p.numero || "Proposta")} · ${U.esc(U.SERVICOS[p.servico] || "")}</div><div class="s">${U.esc(p.tutor_nome || "sem nome")} · ${U.brl(p.valor_total)}</div></div><span class="btn soft small">Abrir</span></a>`,
    semWhats: t => `<form class="item cp-f" data-tutor="${t.id}"><div class="main"><div class="t"><a href="#/tutor/${t.id}">${U.esc(t.nome)}</a></div>
      <input name="whatsapp" inputmode="tel" placeholder="(47) 9 9999-9999" aria-label="WhatsApp de ${U.esc(t.nome)}"></div><button class="btn primary small">Salvar</button></form>`,
    semNome: p => `<form class="item cp-f" data-pet="${p.id}" data-campo="nome"><div class="main"><div class="t">${p.especie === "gato" ? "Gato" : "Cão"}${p.raca ? " · " + U.esc(p.raca) : ""}${nomeTutor(p)}</div>
      <input name="nome" placeholder="Nome do pet" aria-label="Nome do pet"></div><button class="btn primary small">Salvar</button></form>`,
    semRaca: p => `<form class="item cp-f" data-pet="${p.id}" data-campo="raca"><div class="main"><div class="t"><a href="#/pet/${p.id}">${U.esc(p.nome)}</a>${nomeTutor(p)}</div>
      <input name="raca" placeholder="${p.especie === "gato" ? "Ex.: SRD, Siamês" : "Ex.: SRD, Shih-tzu"}" aria-label="Raça de ${U.esc(p.nome)}"></div><button class="btn primary small">Salvar</button></form>`,
    semFoto: p => `<div class="item"><div class="av">${U.PAW}</div><div class="main"><div class="t"><a href="#/pet/${p.id}">${U.esc(p.nome || "Pet sem nome")}</a>${nomeTutor(p)}</div></div>
      <button class="btn soft small" data-foto="${p.id}">${ic("camera")} Pôr foto</button></div>`,
    semData: p => `<a class="item" href="#/proposta/${p.id}"><div class="main"><div class="t">${U.esc(p.tutor_nome || "")} · ${U.esc(U.SERVICOS[p.servico] || "")}</div><div class="s">${U.esc(p.numero || "")} · ${U.pill(p.status)}</div></div><span class="btn soft small">Pôr datas</span></a>`,
  };
  root.innerHTML = `<h1 class="pg">Completar cadastros</h1>
    <p class="muted" style="margin-top:-4px">${total ? `Faltam <b>${total}</b> informações, a maioria dos orçamentos importados. Preencha aqui mesmo: some da lista assim que salva.` : "Tudo completo."}</p>
    ${SEC.filter(([k]) => x[k].length).map(([k, t, d]) => `<h2 class="sec">${t} <span class="count">${x[k].length}</span></h2>${d ? `<p class="muted" style="margin:-6px 0 8px">${d}</p>` : ""}
      <div class="list cp-list" data-sec="${k}">${x[k].map(linhas[k]).join("")}</div>`).join("")}
    ${total ? "" : `<div class="empty">${ic("check")} Nenhum cadastro incompleto.</div>`}
    <input type="file" id="cpFile" accept="image/*" hidden>`;

  const tirar = el => { const lista = el.closest(".cp-list"); el.remove(); if (lista && !lista.children.length) { lista.previousElementSibling?.classList.contains("muted") && lista.previousElementSibling.remove(); lista.previousElementSibling?.remove(); lista.remove(); } };
  root.addEventListener("submit", async e => {
    const f = e.target.closest(".cp-f"); if (!f) return; e.preventDefault();
    const inp = f.querySelector("input"); const v = inp.value.trim(); if (!v) { inp.focus(); return; }
    const b = f.querySelector("button"); b.disabled = true;
    try {
      if (f.dataset.tutor) { if (v.replace(/\D/g, "").length < 10) { U.toast("Confira o número com DDD."); b.disabled = false; return; } await db.saveTutor({ id: f.dataset.tutor, whatsapp: v }); }
      else await db.savePet({ id: f.dataset.pet, [f.dataset.campo]: v });
      U.toast("Salvo"); tirar(f);
    } catch (err) { U.toast("Não consegui salvar: " + err.message); b.disabled = false; }
  });
  let alvo = null;
  root.addEventListener("click", e => { const b = e.target.closest("[data-foto]"); if (!b) return; alvo = b; U.$("#cpFile", root).click(); });
  U.$("#cpFile", root).addEventListener("change", async e => {
    const file = e.target.files[0]; e.target.value = ""; if (!file || !alvo) return;
    const id = alvo.dataset.foto; alvo.disabled = true; alvo.textContent = "Enviando…";
    try { const blob = await enquadrar(file); if (!blob) { alvo.disabled = false; alvo.innerHTML = `${ic("camera")} Pôr foto`; return; } const path = await db.uploadFoto(id, blob); await db.savePet({ id, foto_path: path }); U.toast("Foto salva"); tirar(alvo.closest(".item")); }
    catch (err) { U.toast("Não consegui enviar a foto: " + err.message); alvo.disabled = false; alvo.innerHTML = `${ic("camera")} Pôr foto`; }
  });
}
