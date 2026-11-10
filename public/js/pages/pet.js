// Ficha do pet: foto, dados, anamnese, tutor e histórico
import * as U from "../ui.js";
import * as db from "../db.js";
import { gestao } from "../perfil.js";
import { ic } from "../icones.js";

function squareBlob(file, size = 900) {
  return new Promise((res, rej) => {
    const r = new FileReader(); r.onload = () => { const img = new Image(); img.onload = () => {
      const s = Math.min(img.width, img.height); const c = document.createElement("canvas"); c.width = c.height = size; const x = c.getContext("2d");
      x.imageSmoothingQuality = "high"; x.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      c.toBlob(b => res(b), "image/jpeg", .9);
    }; img.onerror = rej; img.src = r.result; }; r.readAsDataURL(file);
  });
}

export async function mount(root, { params }) {
  const id = params[0] === "novo" ? null : params[0];
  let pet = { nome: "", especie: "cao", porte: "P", passeia: true, ativo: true, reativo: false }, props = [];
  let tutorId = null;
  try { tutorId = sessionStorage.getItem("petlar_novo_pet_tutor"); sessionStorage.removeItem("petlar_novo_pet_tutor"); } catch { }
  if (id) { const d = await db.petDetalhe(id); pet = d.pet; props = d.props; tutorId = pet.tutor_id; }
  let tutor = pet.tutores || (tutorId ? await db.getTutor(tutorId).catch(() => null) : null);
  let fotoUrl = pet.foto_path ? (await db.fotoUrls([pet.foto_path]).catch(() => ({})))[pet.foto_path] : null;

  const f = (k, label, type = "text", ph = "") => `<label class="f">${label}${type === "area" ? `<textarea name="${k}" rows="2" placeholder="${ph}">${U.esc(pet[k] || "")}</textarea>` : `<input type="${type}" name="${k}" value="${U.esc(pet[k] || "")}" placeholder="${ph}">`}</label>`;
  root.innerHTML = `<a class="backlink" href="#/pets">‹ Pets</a>
    <h1 class="pg">${U.esc(pet.nome || (id ? "Pet sem nome" : "Novo pet"))}</h1>
    ${pet.atualizado_tutor_em ? `<div class="tutor-atualizou">${ic("check")} O tutor atualizou a ficha pela área do tutor em ${U.fmtY(pet.atualizado_tutor_em.slice(0, 10))}.</div>` : ""}
    <div class="grid2">
      <form class="panel" id="fPet">
        <div style="display:flex;gap:14px;align-items:center;margin-bottom:12px">
          <div class="ph" id="ph" style="width:96px;height:96px">${fotoUrl ? `<img src="${fotoUrl}" alt=""><span class="chg">trocar</span>` : U.PAW + "<small>foto</small>"}</div>
          <div class="photo-actions" style="margin:0;flex-direction:column;align-items:flex-start">
            <button type="button" class="btn mini" id="bFoto">${ic("camera")} ${fotoUrl ? "Trocar" : "Adicionar"} foto</button>
            ${fotoUrl ? `<button type="button" class="btn mini danger" id="bRmFoto">${ic("lixo")} Remover foto</button>` : ""}
          </div>
        </div>
        ${f("nome", "Nome", "text", "Ex.: Bento")}
        <div class="chips"><button type="button" class="chip" data-esp="cao">${ic("cao")} Cão</button><button type="button" class="chip" data-esp="gato">${ic("gato")} Gato</button></div>
        <div class="row">${f("raca", "Raça", "text", "Ex.: SRD")}${f("idade", "Idade", "text", "Ex.: 4 anos")}</div>
        <label class="f" id="wPorte">Porte<select name="porte">${Object.entries({ P: "Pequeno (até 10 kg)", M: "Médio (10–25 kg)", G: "Grande (25–40 kg)", GG: "Gigante (40 kg+)" }).map(([k, v]) => `<option value="${k}" ${pet.porte === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label class="check" id="wPasseia"><input type="checkbox" name="passeia" ${pet.passeia ? "checked" : ""}> Vai passear nas visitas</label>
        <h3 style="margin-top:14px">Ficha</h3>
        ${f("alimentacao", "Alimentação (marca, quantidade, horários)", "area")}
        ${f("medicacao", "Remédios", "area")}
        ${f("comportamento", "Comportamento com estranhos / outros pets", "area")}
        ${f("limitacoes", "Limitações físicas / saúde", "area")}
        ${f("veterinario", "Veterinário (nome e telefone)")}
        ${f("observacoes", "Outras observações", "area")}
        <label class="check"><input type="checkbox" name="reativo" ${pet.reativo ? "checked" : ""}> Pode ser reativo / agressivo</label>
        <label class="check"><input type="checkbox" name="ativo" ${pet.ativo !== false ? "checked" : ""}> Cliente ativo</label>
        <div class="row-actions" style="margin-top:8px"><button class="btn primary" type="submit">Salvar</button>${id && gestao() ? `<a class="btn soft" href="#/proposta/nova" id="bProp">Nova proposta</a>` : ""}</div>
      </form>
      <div>
        <div class="panel"><h3>Tutor</h3><div id="tutorBox"></div></div>
        ${id ? `<h2 class="sec">Histórico <span class="count">${props.length}</span></h2>
        <div class="list">${props.length ? props.map(p => `<a class="item" href="#/proposta/${p.id}"><div class="main"><div class="t">${U.SERVICOS[p.servico]} · ${U.esc(p.numero || "")}</div><div class="s">${U.esc(U.periodo(p.data_inicio, p.data_fim))}</div></div><div class="r">${gestao() ? `<div class="v">${U.brl(p.valor_total)}</div>` : ""}${U.pill(p.status)}</div></a>`).join("") : `<div class="empty">Ainda sem propostas.</div>`}</div>
        <h2 class="sec">Diário <span class="count" id="dCnt"></span></h2><div id="diarioPet">${U.skeleton(2)}</div>
        ${gestao() ? `<div class="danger-zone"><button class="btn danger" id="bDel">Excluir pet</button></div>` : ""}` : ""}
      </div>
    </div><input type="file" accept="image/*" id="file" class="hide">`;

  const form = U.$("#fPet", root);
  let esp = pet.especie;
  const syncEsp = () => { U.$$("[data-esp]", root).forEach(c => c.classList.toggle("on", c.dataset.esp === esp)); U.$("#wPorte", root).classList.toggle("hide", esp === "gato"); U.$("#wPasseia", root).classList.toggle("hide", esp === "gato"); };
  syncEsp();
  U.$$("[data-esp]", root).forEach(c => c.addEventListener("click", () => { esp = c.dataset.esp; syncEsp(); }));

  function renderTutor() {
    U.$("#tutorBox", root).innerHTML = tutor ? `<a class="item" href="#/tutor/${tutor.id}" style="background:#fff"><div class="av round">${U.USER}</div><div class="main"><div class="t">${U.esc(tutor.nome)}</div><div class="s">${U.esc(tutor.whatsapp || "")}</div></div></a><button class="x" id="bTrocaTutor" type="button">trocar tutor</button>`
      : `<div class="ac"><input type="text" id="qTutor" placeholder="Buscar tutor pelo nome" autocomplete="off"><div class="ac-list hide" id="acT"></div></div>`;
    const bt = U.$("#bTrocaTutor", root); if (bt) bt.onclick = () => { tutor = null; renderTutor(); };
    const qi = U.$("#qTutor", root); if (!qi) return;
    const ac = U.$("#acT", root);
    qi.addEventListener("input", U.debounce(async () => {
      if (qi.value.trim().length < 2) { ac.classList.add("hide"); return; }
      const r = await db.searchTutores(qi.value).catch(() => []);
      ac.innerHTML = r.map(t => `<button type="button" data-id="${t.id}">${U.esc(t.nome)}<small>${U.esc(t.whatsapp || "")}</small></button>`).join("") || `<button type="button" disabled>Nenhum tutor. Cadastre em Tutores.</button>`;
      ac.classList.remove("hide"); ac._r = r;
    }, 250));
    ac.addEventListener("click", e => { const b = e.target.closest("[data-id]"); if (!b) return; tutor = ac._r.find(t => t.id === b.dataset.id); renderTutor(); });
  }
  renderTutor();

  form.addEventListener("submit", async e => {
    e.preventDefault(); const fd = new FormData(form); const b = form.querySelector("[type=submit]"); b.disabled = true;
    const v = { nome: fd.get("nome").trim() || null, especie: esp, raca: fd.get("raca") || null, idade: fd.get("idade") || null, porte: fd.get("porte") || "P",
      passeia: !!fd.get("passeia"), alimentacao: fd.get("alimentacao") || null, medicacao: fd.get("medicacao") || null, comportamento: fd.get("comportamento") || null,
      limitacoes: fd.get("limitacoes") || null, veterinario: fd.get("veterinario") || null, observacoes: fd.get("observacoes") || null,
      reativo: !!fd.get("reativo"), ativo: !!fd.get("ativo"), tutor_id: tutor ? tutor.id : null };
    try { const r = await db.savePet(id ? { id, ...v } : v); U.toast("Pet salvo"); if (!id) location.hash = "#/pet/" + r.id; else { pet = { ...pet, ...r }; U.$("h1.pg", root).textContent = r.nome || "Pet sem nome"; } }
    catch (err) { U.toast("Não consegui salvar: " + err.message); } finally { b.disabled = false; }
  });

  const pick = () => { if (!id) { U.toast("Salve o pet primeiro, depois adicione a foto."); return; } U.$("#file", root).click(); };
  U.$("#ph", root).addEventListener("click", pick); U.$("#bFoto", root).addEventListener("click", pick);
  U.$("#file", root).addEventListener("change", async e => {
    const file = e.target.files[0]; if (!file) return;
    U.$("#ph", root).innerHTML = '<div class="sk" style="width:100%;height:100%"></div>';
    try {
      const blob = await squareBlob(file); const old = pet.foto_path;
      const path = await db.uploadFoto(id, blob); await db.savePet({ id, foto_path: path }); if (old) db.removeFoto(old).catch(() => {});
      U.toast("Foto salva"); mount(root, { params });
    } catch (err) { U.toast("Não consegui enviar a foto: " + err.message); mount(root, { params }); }
  });
  const rm = U.$("#bRmFoto", root);
  if (rm) rm.addEventListener("click", async () => { await db.savePet({ id, foto_path: null }); db.removeFoto(pet.foto_path).catch(() => {}); U.toast("Foto removida"); mount(root, { params }); });
  const bp = U.$("#bProp", root);
  if (bp) bp.addEventListener("click", () => { if (tutor) sessionStorage.setItem("petlar_nova_tutor", tutor.id); });
  if (id) diarioPet().catch(() => { const b = U.$("#diarioPet", root); if (b) b.innerHTML = `<div class="empty">Não consegui carregar o diário.</div>`; });
  async function diarioPet() {
    const { TIPOS } = await import("./diario.js");
    const regs = await db.diarioDoPet(id, 60); const fts = await db.fotoUrls(regs.map(r => r.foto_path)).catch(() => ({}));
    const box = U.$("#diarioPet", root); if (!box) return; U.$("#dCnt", root).textContent = regs.length;
    if (!regs.length) { box.innerHTML = `<div class="empty">Sem registros ainda. O diário é preenchido durante as visitas e estadias (botão “Diário” na tela Hoje).</div>`; return; }
    const porDia = {}; regs.forEach(r => { const d = U.iso(new Date(r.criado_em)); (porDia[d] = porDia[d] || []).push(r); });
    box.innerHTML = Object.entries(porDia).map(([d, rs]) => `<div class="tl-dia"><b>${U.fmtY(d)}</b>${rs.some(r => r.proposta_id) ? ` <a href="#/diario/${rs.find(r => r.proposta_id).proposta_id}" class="muted">abrir</a>` : ""}
      <div class="tl">${rs.slice().reverse().map(r => `<div class="tl-i"><span class="tl-h">${new Date(r.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span><span class="tl-ic">${TIPOS[r.tipo]?.[0] || "•"}</span>
        <span class="tl-t"><b>${r.tipo === "nota" ? "Recado" : TIPOS[r.tipo]?.[1] || r.tipo}</b>${r.nota ? `<br>${U.esc(r.nota)}` : ""}${r.foto_path && fts[r.foto_path] ? `<img src="${fts[r.foto_path]}" alt="" loading="lazy">` : ""}</span></div>`).join("")}</div></div>`).join("");
  }
  const del = U.$("#bDel", root);
  if (del) del.addEventListener("click", async () => {
    if (!(await U.confirmDialog(`Excluir ${pet.nome || "este pet"}? As propostas continuam, mas sem o vínculo com o pet.`, { ok: "Excluir", danger: true }))) return;
    await db.deletePet(id); if (pet.foto_path) db.removeFoto(pet.foto_path).catch(() => {}); U.toast("Pet excluído"); location.hash = "#/pets";
  });
}
