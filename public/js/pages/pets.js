// Pets: ativos agora, próximos (confirmados) e todos
import * as U from "../ui.js";
import * as db from "../db.js";
import { gestao } from "../perfil.js";
import * as F from "../filtros.js";

export async function mount(root) {
  let aba = sessionStorage.getItem("petlar_aba_pets") || "ativos", q = "", page = 0, items = [], total = 0;
  root.innerHTML = `<h1 class="pg">Pets</h1>
    <div class="chips" id="abas"><button class="chip" data-v="ativos">Com a Lari agora</button><button class="chip" data-v="proximos">Próximos</button><button class="chip" data-v="todos">Todos</button></div>
    <div id="fbar"></div>
    <div class="toolbar hide" id="tb"><div class="grow search"><input type="text" id="q" placeholder="Buscar pet pelo nome" autocomplete="off"></div></div>
    <div id="lista">${U.skeleton(4)}</div><div class="more" id="more"></div>
    ${gestao() ? `<a class="btn primary fab" href="#/pet/novo">+ Novo pet</a>` : ""}`;
  const filtros = F.criar(U.$("#fbar", root), { chave: "pets", aoMudar: () => load(), campos: [
    { k: "especie", rotulo: "Espécie", tipo: "opcoes", opcoes: [["cao", "Cão"], ["gato", "Gato"]] },
    { k: "porte", rotulo: "Porte", tipo: "opcoes", opcoes: [["P", "Pequeno"], ["M", "Médio"], ["G", "Grande"], ["GG", "Gigante"]] },
    { k: "situacao", rotulo: "Situação", tipo: "opcoes", opcoes: [["ativo", "Ativos"], ["inativo", "Inativos"]] },
    { k: "foto", rotulo: "Foto", tipo: "opcoes", opcoes: [["com", "Com foto"], ["sem", "Sem foto"]] },
    { k: "cuidados", rotulo: "Cuidados", tipo: "opcoes", opcoes: [["medicacao", "Toma remédio"], ["limitacoes", "Tem limitação"], ["reativo", "Reativo"]], dica: "Mostra quem tem qualquer um dos marcados" },
    { k: "tutor", rotulo: "Tutor", tipo: "texto", dica: "Parte do nome do tutor" },
  ] });
  const passa = (p, tutorNome) => { const v = filtros.valores;
    if (v.especie?.length && !v.especie.includes(p.especie)) return false;
    if (v.porte?.length && (p.especie === "gato" || !v.porte.includes(p.porte))) return false;
    if (v.situacao?.length === 1 && (v.situacao[0] === "ativo") !== (p.ativo !== false)) return false;
    if (v.foto?.length === 1 && (v.foto[0] === "com") !== !!p.foto_path) return false;
    if (v.cuidados?.length && !v.cuidados.some(c => c === "reativo" ? p.reativo : !!(p[c] || "").trim())) return false;
    if (v.tutor && !(tutorNome || "").toLowerCase().includes(v.tutor.toLowerCase())) return false;
    return true; };
  const sync = () => { U.$$("#abas .chip", root).forEach(c => c.classList.toggle("on", c.dataset.v === aba)); U.$("#tb", root).classList.toggle("hide", aba !== "todos"); };

  const petRow = (p, fotos, sub, extra = "") => `<a class="item" href="#/pet/${p.id}">
    <div class="av">${p.foto_path && fotos[p.foto_path] ? `<img src="${fotos[p.foto_path]}" alt="" loading="lazy">` : U.PAW}</div>
    <div class="main"><div class="t">${U.esc(p.nome || (p.especie === "gato" ? "Gato sem nome" : "Cão sem nome"))}</div><div class="s">${sub}</div></div><div class="r">${extra}</div></a>`;

  async function loadServicos(tipo) {
    const hoje = U.today();
    const props = tipo === "ativos" ? await db.propostasAtivas(hoje) : await db.propostasProximas(hoje, 60);
    const linhas = props.flatMap(p => (p.proposta_pets || []).map(x => x.pets).filter(Boolean).map(pet => ({ pet, p }))).filter(({ pet, p }) => passa(pet, p.tutor_nome));
    const fotos = await db.fotoUrls(linhas.map(l => l.pet.foto_path)).catch(() => ({}));
    U.$("#more", root).innerHTML = "";
    U.$("#lista", root).innerHTML = linhas.length ? `<div class="list">${linhas.map(({ pet, p }) =>
      petRow(pet, fotos, `${U.svcPill(p.servico)} ${U.esc(U.periodo(p.data_inicio, p.data_fim))} · ${U.esc(p.tutor_nome || "")}`, tipo === "proximos" ? `<b style="font-size:13px">${U.fmt(p.data_inicio)}</b>` : "")).join("")}</div>`
      : `<div class="empty">${filtros.ativos() ? "Nenhum pet com esses filtros." : tipo === "ativos" ? "Nenhum pet com a Lari agora." : "Nenhum serviço confirmado nos próximos 60 dias."}<br><small>Os pets aparecem aqui quando a proposta é marcada como aceita.</small></div>`;
  }
  async function loadTodos(reset = true) {
    if (reset) { page = 0; items = []; U.$("#lista", root).innerHTML = U.skeleton(5); }
    const comF = filtros.ativos() > 0;
    const myQ = q; const r = await db.listPets({ q, page: comF ? 0 : page, size: comF ? 1000 : 30 }); if (myQ !== q) return;
    if (comF) { items = r.data.filter(p => passa(p, p.tutores?.nome)); total = items.length; }
    else { items = items.concat(r.data); total = r.count; }
    const fotos = await db.fotoUrls(items.map(p => p.foto_path)).catch(() => ({}));
    U.$("#lista", root).innerHTML = items.length ? `<div class="list">${items.map(p => petRow(p, fotos, `${p.especie === "gato" ? "Gato" : "Cão " + U.PORTE_TXT[p.porte].toLowerCase()}${p.raca ? " · " + U.esc(p.raca) : ""}${p.tutores?.nome ? " · " + U.esc(p.tutores.nome) : ""}`, p.ativo ? "" : '<span class="pill cancelada">inativo</span>')).join("")}</div>`
      : `<div class="empty">${q || filtros.ativos() ? "Nenhum pet com essa busca ou filtro." : "Nenhum pet cadastrado ainda."}</div>`;
    U.$("#more", root).innerHTML = items.length < total ? `<button class="btn soft" id="bMore">Carregar mais</button>` : "";
    const b = U.$("#bMore", root); if (b) b.onclick = () => { page++; loadTodos(false); };
  }
  const load = () => { sync(); U.$("#lista", root).innerHTML = U.skeleton(4); (aba === "todos" ? loadTodos() : loadServicos(aba)).catch(() => { U.$("#lista", root).innerHTML = `<div class="empty">Não consegui carregar.</div>`; }); };
  U.$("#abas", root).addEventListener("click", e => { const c = e.target.closest(".chip"); if (!c) return; aba = c.dataset.v; sessionStorage.setItem("petlar_aba_pets", aba); load(); });
  U.$("#q", root).addEventListener("input", U.debounce(e => { q = e.target.value.trim(); loadTodos(); }, 300));
  load();
}
