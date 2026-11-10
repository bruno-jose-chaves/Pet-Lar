// Ficha do tutor: dados, pets (um ou vários), histórico de orçamentos e quanto já contratou
import * as U from "../ui.js";
import * as db from "../db.js";
import { gestao } from "../perfil.js";
import { ic } from "../icones.js";

export async function mount(root, { params }) {
  const id = params[0] === "novo" ? null : params[0];
  const g = gestao();
  let t = { nome: "", whatsapp: "", email: "", endereco: "", bairro: "", cidade: "Balneário Camboriú", observacoes: "" }, pets = [], props = [];
  if (id) ({ tutor: t, pets, props } = await db.tutorDetalhe(id));
  const avals = id && g ? await db.avaliacoesDoTutor(id).catch(() => []) : [];
  const fotos = await db.fotoUrls(pets.map(p => p.foto_path)).catch(() => ({}));
  const aceitas = props.filter(p => p.status === "aceita");
  const gasto = aceitas.reduce((a, p) => a + Number(p.valor_total || 0), 0);
  const respondidas = props.filter(p => p.status === "aceita" || p.status === "recusada").length;
  const f = (k, label, type = "text", ph = "") => `<label class="f">${label}${type === "area" ? `<textarea name="${k}" rows="3">${U.esc(t[k] || "")}</textarea>` : `<input type="${type}" name="${k}" value="${U.esc(t[k] || "")}" placeholder="${ph}" ${type === "tel" ? 'inputmode="tel"' : ""}>`}</label>`;

  // histórico: uma linha por orçamento, do mais novo para o mais antigo
  const hist = props.map(p => {
    const nomes = (p.proposta_pets || []).map(x => x.pets?.nome).filter(Boolean).join(", ");
    const quando = p.created_at ? U.fmtY(p.created_at.slice(0, 10)) : "";
    const desc = p.valor_cheio > p.valor_total ? ` <s class="muted">${U.brl(p.valor_cheio)}</s>` : "";
    return `<a class="item hist" href="#/proposta/${p.id}">
      <div class="main"><div class="t">${U.SERVICOS[p.servico] || p.servico}${nomes ? " · " + U.esc(nomes) : ""}</div>
      <div class="s">${U.esc(p.numero || "")} · feita em ${quando}${p.data_inicio ? " · serviço " + U.esc(U.periodo(p.data_inicio, p.data_fim)) : " · sem data"}</div></div>
      <div class="r">${g ? `<div class="v">${U.brl(p.valor_total)}${desc}</div>` : ""}${U.pill(p.status)}${(a => a ? `<div class="aval" title="${U.esc(a.comentario || "")}">${ic("estrela")} ${a.nota}/5</div>` : "")(avals.find(a => a.proposta_id === p.id))}</div></a>`;
  }).join("");

  root.innerHTML = `<a class="backlink" href="#/tutores">‹ Tutores</a>
    <h1 class="pg">${U.esc(t.nome || "Novo tutor")}</h1>
    ${id && g ? `<div class="kpis" style="margin-bottom:14px"><div class="kpi"><span>Pets</span><b>${pets.length}</b></div><div class="kpi"><span>Orçamentos</span><b>${props.length}</b><small>${respondidas ? Math.round(aceitas.length / respondidas * 100) + "% aceitos" : "nenhum respondido"}</small></div><div class="kpi"><span>Aceitos</span><b>${aceitas.length}</b></div><div class="kpi"><span>Já contratou</span><b>${U.brl(gasto)}</b></div></div>` : ""}
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
        <div class="list">${pets.map(p => `<a class="item" href="#/pet/${p.id}"><div class="av">${p.foto_path && fotos[p.foto_path] ? `<img src="${fotos[p.foto_path]}" alt="" loading="lazy">` : U.PAW}</div><div class="main"><div class="t">${U.esc(p.nome || "Sem nome")}${p.ativo === false ? ' <span class="muted">(inativo)</span>' : ""}</div><div class="s">${p.especie === "gato" ? "Gato" : "Cão " + U.PORTE_TXT[p.porte].toLowerCase()}${p.raca ? " · " + U.esc(p.raca) : ""}</div></div><div class="r muted">editar ›</div></a>`).join("") || `<div class="empty">Nenhum pet ainda.</div>`}</div>
        ${g ? `<div class="row-actions" style="margin-top:8px"><button class="btn soft small" id="bNovoPet">+ Adicionar pet</button><button class="btn primary small" id="bNovaProp">+ Nova proposta</button></div>` : ""}
        ${g ? `<h2 class="sec">Área do tutor</h2><div class="panel portal-box" id="portalBox"><div class="sk" style="height:60px"></div></div>` : ""}
        <h2 class="sec">${g ? "Histórico de orçamentos" : "Serviços confirmados"} <span class="count">${props.length}</span></h2>
        <div class="list">${hist || `<div class="empty">Nenhum orçamento ainda.</div>`}</div>
        ${g ? `<div class="danger-zone"><button class="btn danger" id="bDel">Excluir tutor</button></div>` : ""}` : `<div class="empty">Salve o tutor para adicionar pets e propostas.</div>`}
      </div>
    </div>`;
  U.$("#fT", root).addEventListener("submit", async e => {
    e.preventDefault(); const fd = Object.fromEntries(new FormData(e.target));
    if (!fd.nome.trim()) { U.toast("Coloque o nome do tutor."); return; }
    const v = Object.fromEntries(Object.entries(fd).map(([k, x]) => [k, String(x).trim() || null]));
    try { const r = await db.saveTutor(id ? { id, ...v } : v); U.toast("Tutor salvo"); if (!id) location.hash = "#/tutor/" + r.id; else U.$("h1.pg", root).textContent = r.nome; }
    catch (err) { U.toast("Não consegui salvar: " + err.message); }
  });
  if (!id || !g) return;
  pintarPortal();
  U.$("#bNovaProp", root).onclick = () => { sessionStorage.setItem("petlar_nova_tutor", id); location.hash = "#/proposta/nova"; };
  U.$("#bNovoPet", root).onclick = () => { sessionStorage.setItem("petlar_novo_pet_tutor", id); location.hash = "#/pet/novo"; };
  U.$("#bDel", root).onclick = async () => {
    if (!(await U.confirmDialog(`Excluir ${t.nome}? Pets e propostas continuam, mas ficam sem tutor.`, { ok: "Excluir", danger: true }))) return;
    await db.deleteTutor(id); U.toast("Tutor excluído"); location.hash = "#/tutores";
  };

  // ---------- área do tutor: link pessoal ----------
  async function pintarPortal() {
    const box = U.$("#portalBox", root); if (!box) return;
    let a = null; try { a = await db.acessoTutor(id); } catch { box.innerHTML = `<p class="muted">Não consegui carregar o link agora.</p>`; return; }
    const nomePets = pets.map(p => p.nome).filter(Boolean);
    const quem = nomePets.length ? (nomePets.length === 1 ? (pets[0].especie === "gato" ? "a " : "o ") + nomePets[0] : "os seus pets") : "o seu pet";
    if (!a) {
      box.innerHTML = `<p class="muted" style="margin:0 0 10px">Um link só de ${U.esc(t.nome.split(" ")[0])}, sem senha, para ver o diário com fotos, confirmar orçamentos, pagar o sinal no Pix e atualizar a ficha dos pets.</p>
        <button class="btn primary" id="pCriar">${ic("link")} Criar link da área do tutor</button>`;
      U.$("#pCriar", box).onclick = async e => { e.currentTarget.disabled = true; try { await db.criarAcessoTutor(id); pintarPortal(); } catch (err) { U.toast("Não consegui criar: " + err.message); e.currentTarget.disabled = false; } };
      return;
    }
    const url = db.linkPortal(a.token);
    const msg = `Oi, ${t.nome.split(" ")[0]}! Criei um cantinho para você acompanhar ${quem} aqui na Pet Lar: fotos e diário de cada dia, orçamentos e a ficha. É só tocar no link, não precisa de senha:\n${url}\n\nEsse link é só seu, tá? Não encaminhe para outras pessoas.`;
    box.innerHTML = `<div class="portal-url"><span>${ic("link")}</span><input readonly value="${U.esc(url)}" aria-label="Link da área do tutor"></div>
      <div class="kv" style="margin:10px 0">
        <span>Criado em</span><b>${U.fmtY(a.criado_em.slice(0, 10))}</b>
        <span>Aviso de privacidade</span><b>${a.aceite_em ? "aceito em " + U.fmtY(a.aceite_em.slice(0, 10)) : "ainda não abriu"}</b>
        <span>Último acesso</span><b>${a.ultimo_acesso ? U.relTime(a.ultimo_acesso) + ` · ${a.acessos} acesso${a.acessos === 1 ? "" : "s"}` : "nunca"}</b></div>
      <div class="row-actions">${t.whatsapp ? `<a class="btn primary small" href="${U.waLink(t.whatsapp, msg)}" target="_blank" rel="noopener">${ic("conversa")} Mandar no WhatsApp</a>` : ""}
        <button class="btn soft small" id="pCopiar">${ic("copiar")} Copiar link</button>
        <a class="btn soft small" href="${U.esc(url)}" target="_blank" rel="noopener">${ic("olho")} Ver como o tutor vê</a>
        <button class="btn soft small" id="pTrocar">${ic("voltar")} Trocar link</button>
        <button class="btn danger small" id="pDesativar">Desativar</button></div>
      ${t.whatsapp ? "" : `<p class="muted" style="margin:8px 0 0">Cadastre o WhatsApp do tutor para mandar o link com um toque.</p>`}`;
    U.$("#pCopiar", box).onclick = async () => { await U.copyText(url); U.toast("Link copiado"); };
    U.$("#pTrocar", box).onclick = async () => {
      if (!(await U.confirmDialog("Trocar o link? O link antigo para de funcionar e você manda o novo para o tutor.", { ok: "Trocar link" }))) return;
      await db.revogarAcessoTutor(a.id); await db.criarAcessoTutor(id); U.toast("Link novo criado. Mande para o tutor."); pintarPortal();
    };
    U.$("#pDesativar", box).onclick = async () => {
      if (!(await U.confirmDialog("Desativar a área do tutor? O link para de funcionar na hora.", { ok: "Desativar", danger: true }))) return;
      await db.revogarAcessoTutor(a.id); U.toast("Área do tutor desativada"); pintarPortal();
    };
  }
}
