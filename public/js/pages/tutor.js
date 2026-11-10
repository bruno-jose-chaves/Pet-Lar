// Ficha do tutor: dados, pets, propostas e quanto já contratou
import * as U from "../ui.js";
import * as db from "../db.js";

export async function mount(root, { params }) {
  const id = params[0] === "novo" ? null : params[0];
  let t = { nome: "", whatsapp: "", email: "", endereco: "", bairro: "", cidade: "Balneário Camboriú", observacoes: "" }, pets = [], props = [];
  if (id) ({ tutor: t, pets, props } = await db.tutorDetalhe(id));
  const fotos = await db.fotoUrls(pets.map(p => p.foto_path)).catch(() => ({}));
  const gasto = props.filter(p => p.status === "aceita").reduce((a, p) => a + Number(p.valor_total || 0), 0);
  const f = (k, label, type = "text", ph = "") => `<label class="f">${label}${type === "area" ? `<textarea name="${k}" rows="3">${U.esc(t[k] || "")}</textarea>` : `<input type="${type}" name="${k}" value="${U.esc(t[k] || "")}" placeholder="${ph}" ${type === "tel" ? 'inputmode="tel"' : ""}>`}</label>`;
  root.innerHTML = `<a class="backlink" href="#/tutores">‹ Tutores</a>
    <h1 class="pg">${U.esc(t.nome || "Novo tutor")}</h1>
    ${id ? `<div class="kpis" style="margin-bottom:14px"><div class="kpi"><span>Pets</span><b>${pets.length}</b></div><div class="kpi"><span>Propostas</span><b>${props.length}</b></div><div class="kpi"><span>Aceitas</span><b>${props.filter(p => p.status === "aceita").length}</b></div><div class="kpi"><span>Já contratou</span><b>${U.brl(gasto)}</b></div></div>` : ""}
    <div class="grid2">
      <form class="panel" id="fT">
        ${f("nome", "Nome", "text", "Ex.: Sabrina")}
        ${f("whatsapp", "WhatsApp", "tel", "(47) 9 9999-9999")}
        ${f("email", "E-mail", "email")}
        ${f("endereco", "Endereço", "text", "Rua, número, apto")}
        <div class="row">${f("bairro", "Bairro")}${f("cidade", "Cidade")}</div>
        ${f("observacoes", "Observações (chaves, portaria, código do portão…)", "area")}
        <div class="row-actions"><button class="btn primary" type="submit">Salvar</button>
        ${id && t.whatsapp ? `<a class="btn wa" href="${U.waLink(t.whatsapp, "")}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
        ${id && t.endereco ? `<a class="btn soft" href="https://maps.google.com/?q=${encodeURIComponent([t.endereco, t.bairro, t.cidade].filter(Boolean).join(", "))}" target="_blank" rel="noopener">Mapa</a>` : ""}</div>
      </form>
      <div>${id ? `
        <h2 class="sec" style="margin-top:0">Pets <span class="count">${pets.length}</span></h2>
        <div class="list">${pets.map(p => `<a class="item" href="#/pet/${p.id}"><div class="av">${p.foto_path && fotos[p.foto_path] ? `<img src="${fotos[p.foto_path]}" alt="" loading="lazy">` : U.PAW}</div><div class="main"><div class="t">${U.esc(p.nome || "Sem nome")}</div><div class="s">${p.especie === "gato" ? "Gato" : "Cão " + U.PORTE_TXT[p.porte].toLowerCase()}${p.raca ? " · " + U.esc(p.raca) : ""}</div></div></a>`).join("") || `<div class="empty">Nenhum pet ainda.</div>`}</div>
        <div class="row-actions" style="margin-top:8px"><button class="btn soft small" id="bNovoPet">+ Adicionar pet</button><button class="btn primary small" id="bNovaProp">+ Nova proposta</button></div>
        <h2 class="sec">Propostas <span class="count">${props.length}</span></h2>
        <div class="list">${props.map(p => `<a class="item" href="#/proposta/${p.id}"><div class="main"><div class="t">${U.SERVICOS[p.servico]} · ${U.esc(p.numero || "")}</div><div class="s">${U.esc(U.periodo(p.data_inicio, p.data_fim) || "sem data")}</div></div><div class="r"><div class="v">${U.brl(p.valor_total)}</div>${U.pill(p.status)}</div></a>`).join("") || `<div class="empty">Nenhuma proposta ainda.</div>`}</div>
        <div class="danger-zone"><button class="btn danger" id="bDel">Excluir tutor</button></div>` : `<div class="empty">Salve o tutor para adicionar pets e propostas.</div>`}
      </div>
    </div>`;
  U.$("#fT", root).addEventListener("submit", async e => {
    e.preventDefault(); const fd = Object.fromEntries(new FormData(e.target));
    if (!fd.nome.trim()) { U.toast("Coloque o nome do tutor."); return; }
    const v = Object.fromEntries(Object.entries(fd).map(([k, x]) => [k, String(x).trim() || null]));
    try { const r = await db.saveTutor(id ? { id, ...v } : v); U.toast("Tutor salvo ✓"); if (!id) location.hash = "#/tutor/" + r.id; else U.$("h1.pg", root).textContent = r.nome; }
    catch (err) { U.toast("Não consegui salvar: " + err.message); }
  });
  if (!id) return;
  U.$("#bNovaProp", root).onclick = () => { sessionStorage.setItem("petlar_nova_tutor", id); location.hash = "#/proposta/nova"; };
  U.$("#bNovoPet", root).onclick = () => { sessionStorage.setItem("petlar_novo_pet_tutor", id); location.hash = "#/pet/novo"; };
  U.$("#bDel", root).onclick = async () => {
    if (!(await U.confirmDialog(`Excluir ${t.nome}? Pets e propostas continuam, mas ficam sem tutor.`, { ok: "Excluir", danger: true }))) return;
    await db.deleteTutor(id); U.toast("Tutor excluído"); location.hash = "#/tutores";
  };
}
