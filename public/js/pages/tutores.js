// Lista de tutores (clientes)
import * as U from "../ui.js";
import * as db from "../db.js";

export async function mount(root) {
  let q = "", page = 0, items = [], total = 0;
  root.innerHTML = `<h1 class="pg">Tutores</h1>
    <div class="toolbar"><div class="grow search"><input type="text" id="q" placeholder="Buscar tutor pelo nome" autocomplete="off"></div></div>
    <div id="lista">${U.skeleton(5)}</div><div class="more" id="more"></div>
    <a class="btn primary fab" href="#/tutor/novo">+ Novo tutor</a>`;
  async function load(reset = true) {
    if (reset) { page = 0; items = []; U.$("#lista", root).innerHTML = U.skeleton(5); }
    const myQ = q;
    try {
      const r = await db.listTutores({ q, page }); if (myQ !== q) return;
      items = items.concat(r.data); total = r.count;
      U.$("#lista", root).innerHTML = items.length ? `<div class="list">${items.map(t => `<a class="item" href="#/tutor/${t.id}">
        <div class="av round">${U.USER}</div>
        <div class="main"><div class="t">${U.esc(t.nome)}</div><div class="s">${U.esc([t.whatsapp, t.bairro, t.cidade].filter(Boolean).join(" · "))}</div></div>
        <div class="r muted">${(t.pets || []).length ? "🐾 " + (t.pets || []).map(p => U.esc(p.nome || "pet")).join(", ") : ""}</div></a>`).join("")}</div>`
        : `<div class="empty">${q ? "Nenhum tutor com esse nome." : "Nenhum tutor ainda. Eles entram sozinhos quando você salva uma proposta."}</div>`;
      U.$("#more", root).innerHTML = items.length < total ? `<button class="btn soft" id="bMore">Carregar mais</button>` : "";
      const b = U.$("#bMore", root); if (b) b.onclick = () => { page++; load(false); };
    } catch { U.$("#lista", root).innerHTML = `<div class="empty">Não consegui carregar.</div>`; }
  }
  U.$("#q", root).addEventListener("input", U.debounce(e => { q = e.target.value.trim(); load(); }, 300));
  load();
}
