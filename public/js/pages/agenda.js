// Agenda do mês: serviços confirmados, capacidade de hospedagem e conflitos
import * as U from "../ui.js";
import * as db from "../db.js";
import * as F from "../filtros.js";
import { ic } from "../icones.js";

const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export async function mount(root) {
  const now = new Date(); let ano = now.getFullYear(), mes = now.getMonth(); let sel = U.today();
  const set = await db.getSettings().catch(() => ({ capacidade_hospedagem: 3 }));
  const cap = set.capacidade_hospedagem || 3;
  root.innerHTML = `<h1 class="pg">Agenda</h1>
    <div class="cal-head"><button class="btn soft small" id="prev" aria-label="Mês anterior">‹</button><b id="mesNome"></b><button class="btn soft small" id="hojeB">Hoje</button><button class="btn soft small" id="next" aria-label="Próximo mês">›</button></div>
    <div id="fbar"></div><div id="alerta"></div><div id="cal" class="cal"></div>
    <div class="legend"><span><span class="pill hosp">Hospedagem</span></span><span><span class="pill visitas">Visitas / pacote</span></span><span><span class="pill banho">Banho</span></span><span>Fundo terracota = mais hóspedes que a capacidade (${cap})</span></div>
    <h2 class="sec" id="selT"></h2><div id="selL"></div>`;
  let props = [], fotos = {};
  const filtros = F.criar(U.$("#fbar", root), { chave: "agenda", aoMudar: () => render(), campos: [
    { k: "servicos", rotulo: "Serviço", tipo: "opcoes", opcoes: Object.entries(U.SERVICOS) },
    { k: "especie", rotulo: "Espécie", tipo: "opcoes", opcoes: [["cao", "Cão"], ["gato", "Gato"]] },
    { k: "tutor", rotulo: "Tutor ou pet", tipo: "texto", dica: "Parte do nome" },
  ] });
  const passa = p => { const v = filtros.valores; const pets = (p.proposta_pets || []).map(x => x.pets).filter(Boolean);
    if (v.servicos?.length && !v.servicos.includes(p.servico)) return false;
    if (v.especie?.length && !pets.some(x => v.especie.includes(x.especie))) return false;
    if (v.tutor) { const t = v.tutor.toLowerCase(); if (!((p.tutor_nome || "").toLowerCase().includes(t) || pets.some(x => (x.nome || "").toLowerCase().includes(t)))) return false; }
    return true; };
  const nPets = p => Math.max(1, (p.proposta_pets || []).length);
  const nomes = p => (p.proposta_pets || []).map(x => x.pets?.nome).filter(Boolean).join(", ") || p.tutor_nome || "Pet";
  const doDiaTodos = d => props.filter(p => p.data_inicio <= d && (p.data_fim || p.data_inicio) >= d);
  const doDia = d => doDiaTodos(d).filter(passa); // o que aparece (com filtros)
  const hospDia = d => doDiaTodos(d).filter(p => p.servico === "hosp").reduce((a, p) => a + nPets(p), 0); // capacidade conta todos

  async function load() {
    const ini = U.iso(new Date(ano, mes, 1)), fim = U.iso(new Date(ano, mes + 1, 0));
    U.$("#mesNome", root).textContent = new Date(ano, mes, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).replace(/^./, c => c.toUpperCase());
    U.$("#cal", root).innerHTML = `<div class="sk" style="grid-column:1/-1;height:360px"></div>`;
    props = await db.propostasPeriodo(ini, fim).catch(() => []);
    fotos = await db.fotoUrls(props.flatMap(p => (p.proposta_pets || []).map(x => x.pets?.foto_path))).catch(() => ({}));
    render();
  }
  function render() {
    const first = new Date(ano, mes, 1); const start = new Date(ano, mes, 1 - first.getDay());
    const hoje = U.today(); const conflitos = [];
    let html = DOW.map(d => `<div class="dow">${d}</div>`).join("");
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i); const ds = U.iso(d);
      if (i >= 35 && d.getMonth() !== mes) break;
      const evs = doDia(ds); const h = hospDia(ds); const conf = h > cap;
      if (conf && d.getMonth() === mes) conflitos.push(ds);
      html += `<div class="day ${d.getMonth() !== mes ? "out" : ""} ${ds === hoje ? "today" : ""} ${ds === sel ? "sel" : ""} ${conf ? "conf" : ""}" data-d="${ds}">
        <span class="n">${d.getDate()}</span>${h ? ` <small class="hosp-n" title="hóspedes">${ic("casa")}${h}</small>` : ""}
        ${evs.slice(0, 3).map(p => `<span class="ev ${p.servico}">${U.esc(nomes(p))}</span>`).join("")}${evs.length > 3 ? `<div class="more-ev">+${evs.length - 3}</div>` : ""}</div>`;
    }
    U.$("#cal", root).innerHTML = html;
    U.$("#alerta", root).innerHTML = conflitos.length ? `<div class="warn" style="margin-bottom:10px">${ic("alerta")} Mais hóspedes que a capacidade (${cap}) em: <b>${conflitos.map(U.fmt).join(", ")}</b>. Confira se dá conta ou ajuste a capacidade em Configurações.</div>` : "";
    renderSel();
  }
  function renderSel() {
    const evs = doDia(sel);
    U.$("#selT", root).innerHTML = `${U.pd(sel).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })} <span class="count">${evs.length}</span>`;
    U.$("#selL", root).innerHTML = evs.length ? `<div class="list">${evs.map(p => {
      const pets = (p.proposta_pets || []).map(x => x.pets).filter(Boolean); const fp = pets.find(x => x.foto_path && fotos[x.foto_path]);
      const marco = p.servico === "hosp" ? (p.data_inicio === sel ? "entrada" : p.data_fim === sel ? "saída" : "hospedado") : "";
      return `<a class="item" href="#/proposta/${p.id}"><div class="av">${fp ? `<img src="${fotos[fp.foto_path]}" alt="" loading="lazy">` : U.PAW}</div>
        <div class="main"><div class="t">${U.esc(nomes(p))}</div><div class="s">${U.svcPill(p.servico)} ${U.esc(U.periodo(p.data_inicio, p.data_fim))} · ${U.esc(p.tutor_nome || "")}</div></div>
        <div class="r">${marco ? `<span class="pill aceita">${marco}</span>` : ""}</div></a>`;
    }).join("")}</div>` : `<div class="empty">Nada confirmado neste dia.</div>`;
  }
  U.$("#cal", root).addEventListener("click", e => { const d = e.target.closest("[data-d]"); if (!d) return; sel = d.dataset.d; U.$$(".day", root).forEach(x => x.classList.toggle("sel", x.dataset.d === sel)); renderSel(); });
  U.$("#prev", root).onclick = () => { mes--; if (mes < 0) { mes = 11; ano--; } load(); };
  U.$("#next", root).onclick = () => { mes++; if (mes > 11) { mes = 0; ano++; } load(); };
  U.$("#hojeB", root).onclick = () => { ano = now.getFullYear(); mes = now.getMonth(); sel = U.today(); load(); };
  load();
}
