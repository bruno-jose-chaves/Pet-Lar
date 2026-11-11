// Diário do pet: a Lari registra com um toque o que aconteceu (comeu, passeou, dormiu…), com foto e recado,
// e manda o resumo do dia para o tutor pelo WhatsApp.
import * as U from "../ui.js";
import * as db from "../db.js";
import { ic } from "../icones.js";
import { prepararVideo } from "../video.js";

export const TIPOS = {
  comeu: [ic("comeu"), "Comeu", "🍽️"], agua: [ic("agua"), "Bebeu água", "💧"], passeio: [ic("passeio"), "Passeou", "🦮"], xixi: [ic("xixi"), "Fez xixi", "✅"], coco: [ic("coco"), "Fez cocô", "✅"],
  remedio: [ic("remedio"), "Tomou remédio", "💊"], dormiu: [ic("dormiu"), "Dormiu", "😴"], brincou: [ic("brincou"), "Brincou", "🎾"], banho: [ic("banho"), "Banho", "🛁"],
  chegou: [ic("chegou"), "Chegou", "🏠"], saiu: [ic("saiu"), "Foi para casa", "👋"], foto: [ic("foto"), "Foto", "📸"], video: [ic("video"), "Vídeo", "🎥"], nota: [ic("nota"), "Recado", "📝"],
};
const BOTOES = ["comeu", "agua", "passeio", "xixi", "coco", "remedio", "dormiu", "brincou", "foto", "nota"];
const hora = iso => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

function reduzir(file, max = 1280) {
  return new Promise((res, rej) => {
    const r = new FileReader(); r.onerror = rej;
    r.onload = () => { const img = new Image(); img.onerror = rej; img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => b ? res(b) : rej(new Error("foto")), "image/jpeg", .82); }; img.src = r.result; };
    r.readAsDataURL(file);
  });
}

// junta registros iguais feitos no mesmo minuto para vários pets ("Bento e Nina comeram")
export function agrupar(regs, petsById) {
  const out = [];
  for (const r of regs) {
    const k = `${r.tipo}|${hora(r.criado_em)}|${r.nota || ""}|${r.foto_path || ""}`;
    const g = out.find(x => x.k === k);
    if (g && !r.foto_path) { g.pets.push(petsById[r.pet_id]); g.ids.push(r.id); }
    else out.push({ k, ...r, pets: [petsById[r.pet_id]], ids: [r.id] });
  }
  return out;
}
const nomePet = p => p?.nome || (p?.especie === "gato" ? "o gatinho" : "o pet");
const juntar = arr => arr.length <= 1 ? (arr[0] || "") : arr.slice(0, -1).join(", ") + " e " + arr[arr.length - 1];

export function relatorio(serv, pets, grupos, dia) {
  const oi = serv.tutor_nome ? `Oi, ${serv.tutor_nome.trim().split(/\s+/)[0]}!` : "Oi!";
  const quem = juntar(pets.map(nomePet));
  let t = `${oi} 🐾 Resumo de hoje ${pets.length > 1 ? "da turma" : "de " + quem} (${U.fmt(dia)}):\n`;
  for (const g of grupos) {
    const [, txt, ic] = TIPOS[g.tipo] || ["", g.tipo, "•"];
    const p = pets.length > 1 ? ` · ${juntar(g.pets.map(nomePet))}` : "";
    t += `\n${hora(g.criado_em)} ${ic} ${g.tipo === "nota" ? "" : txt}${p}${g.nota ? (g.tipo === "nota" ? g.nota : ` (${g.nota})`) : ""}`;
  }
  return t + `\n\nCom carinho, Lari 💛`;
}

export async function mount(root, { params }) {
  const id = params[0];
  let serv;
  try { serv = await db.getServicoBasico(id); }
  catch { root.innerHTML = `<a class="backlink" href="#/hoje">‹ Hoje</a><div class="empty">Serviço não encontrado.</div>`; return; }
  const pets = (serv.proposta_pets || []).map(x => x.pets).filter(Boolean);
  const petsById = Object.fromEntries(pets.map(p => [p.id, p]));
  const hoje = U.today();
  let dia = serv.data_inicio && hoje < serv.data_inicio ? serv.data_inicio : serv.data_fim && hoje > serv.data_fim ? serv.data_fim : hoje;
  let selPets = new Set(pets.map(p => p.id)); let regs = []; let fotos = {};
  const fotosPet = await db.fotoUrls(pets.map(p => p.foto_path)).catch(() => ({}));

  root.innerHTML = `<a class="backlink" href="#/hoje">‹ Hoje</a>
    <div class="dhead">${pets.map(p => `<div class="av">${p.foto_path && fotosPet[p.foto_path] ? `<img src="${fotosPet[p.foto_path]}" alt="">` : U.PAW}</div>`).join("")}
      <div><h1 class="pg" style="margin:0">Diário · ${U.esc(juntar(pets.map(p => p.nome || "pet")) || serv.tutor_nome || "")}</h1>
      <div class="muted">${U.svcPill(serv.servico)} ${U.esc(U.periodo(serv.data_inicio, serv.data_fim))}${serv.tutor_nome ? " · " + U.esc(serv.tutor_nome) : ""}</div></div></div>
    <div class="cal-head" style="margin:12px 0 6px"><button class="btn soft small" id="dPrev" aria-label="Dia anterior">‹</button><b id="dNome"></b><button class="btn soft small" id="dNext" aria-label="Próximo dia">›</button></div>
    ${pets.length > 1 ? `<div class="chips" id="dPets"><span class="muted" style="align-self:center">Registrar para:</span>${pets.map(p => `<button class="chip on" data-pet="${p.id}">${U.esc(p.nome || "pet")}</button>`).join("")}</div>` : ""}
    <div class="dbtns" id="dBtns">${BOTOES.map(t => `<button class="dbtn" data-t="${t}"><span>${TIPOS[t][0]}</span>${t === "foto" ? "Foto ou vídeo" : TIPOS[t][1]}</button>`).join("")}</div>
    <input type="file" accept="image/*,video/*" id="dFoto" class="hide">
    <h2 class="sec">Linha do tempo <span class="count" id="dCount"></span></h2>
    <div id="dLista">${U.skeleton(3)}</div>
    <div class="row-actions" style="margin-top:14px"><button class="btn primary" id="dRel">${ic("enviar")} Mandar resumo do dia</button></div>`;

  const nomeDia = () => { const d = U.pd(dia); const t = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }); return (dia === hoje ? "Hoje, " : "") + t; };
  function quandoRegistrar() { // hoje = agora; outro dia = meio-dia daquele dia (dá para ajustar a hora depois)
    if (dia === hoje) return new Date().toISOString();
    return new Date(dia + "T12:00:00").toISOString();
  }
  async function carregar() {
    U.$("#dNome", root).textContent = nomeDia();
    U.$("#dPrev", root).disabled = !!serv.data_inicio && dia <= serv.data_inicio;
    U.$("#dNext", root).disabled = (!!serv.data_fim && dia >= serv.data_fim) || dia >= hoje;
    U.$("#dLista", root).innerHTML = U.skeleton(3);
    try { regs = await db.diarioDoServico(id, dia); } catch { U.$("#dLista", root).innerHTML = `<div class="empty">Não consegui carregar.</div>`; return; }
    fotos = await db.fotoUrls(regs.map(r => r.foto_path)).catch(() => ({}));
    pintar();
  }
  function pintar() {
    const gs = agrupar(regs, petsById);
    U.$("#dCount", root).textContent = gs.length;
    U.$("#dLista", root).innerHTML = gs.length ? `<div class="tl">${gs.map(g => { const [ic, txt] = TIPOS[g.tipo] || ["", g.tipo];
      const tag = g.tipo === "video" ? "div" : "button"; // vídeo tem controles próprios: não pode ficar dentro de um botão
      return `<${tag} class="tl-i" data-ids="${g.ids.join(",")}"${tag === "div" ? ' role="button" tabindex="0"' : ""}><span class="tl-h">${hora(g.criado_em)}</span><span class="tl-ic">${ic}</span>
        <span class="tl-t"><b>${g.tipo === "nota" ? "Recado" : txt}</b>${pets.length > 1 ? ` <span class="muted">· ${U.esc(juntar(g.pets.map(p => p?.nome || "pet")))}</span>` : ""}${g.nota ? `<br><span>${U.esc(g.nota)}</span>` : ""}
        ${g.foto_path && fotos[g.foto_path] ? (g.tipo === "video" ? `<video src="${fotos[g.foto_path]}#t=0.1" controls playsinline preload="metadata"></video>` : `<img src="${fotos[g.foto_path]}" alt="" loading="lazy">`) : ""}</span></${tag}>`; }).join("")}</div>`
      : `<div class="empty">Nada registrado ${dia === hoje ? "hoje" : "neste dia"} ainda. Toque nos botões acima conforme as coisas acontecem.</div>`;
  }
  async function registrar(tipo, extra = {}) {
    const alvos = [...selPets]; if (!alvos.length) { U.toast("Escolha pelo menos um pet."); return; }
    const quando = quandoRegistrar();
    const rows = alvos.map(pet_id => ({ pet_id, proposta_id: id, tipo, criado_em: quando, nota: extra.nota || null, foto_path: extra.foto_path || null }));
    try {
      const novos = await db.addDiario(rows); regs = regs.concat(novos).sort((a, b) => a.criado_em.localeCompare(b.criado_em));
      if (extra.foto_path) fotos = await db.fotoUrls(regs.map(r => r.foto_path)).catch(() => fotos);
      pintar();
      U.toastAcao(`${TIPOS[tipo][1]} · ${hora(quando)}`, "Desfazer", async () => { await db.deleteDiario(novos.map(r => r.id)); regs = regs.filter(r => !novos.some(n => n.id === r.id)); pintar(); });
    } catch { U.toast("Não consegui registrar. Confira a internet e tente de novo."); }
  }
  function pedirTexto(titulo, ph, valor = "") {
    return new Promise(res => {
      const m = U.modal(`<h3>${titulo}</h3><label class="f"><textarea id="dTxt" rows="3" placeholder="${U.esc(ph)}">${U.esc(valor)}</textarea></label>
        <div class="acts"><button class="btn primary" data-ok>Salvar</button><button class="btn soft" data-close>Cancelar</button></div>`, { onClose: () => res(null) });
      setTimeout(() => m.el.querySelector("#dTxt")?.focus(), 50);
      m.el.querySelector("[data-ok]").onclick = () => { const v = m.el.querySelector("#dTxt").value.trim(); res(v); m.close(); };
    });
  }

  U.$("#dBtns", root).addEventListener("click", async e => {
    const b = e.target.closest("[data-t]"); if (!b) return; const t = b.dataset.t;
    if (t === "foto") { U.$("#dFoto", root).click(); return; }
    if (t === "nota") { const v = await pedirTexto("Recado", "Ex.: Comeu tudo e dormiu no sofá"); if (v) registrar("nota", { nota: v }); return; }
    if (t === "remedio") { const v = await pedirTexto("Remédio", "Qual remédio e dose (opcional)"); if (v !== null) registrar("remedio", { nota: v || null }); return; }
    b.classList.add("pulse"); setTimeout(() => b.classList.remove("pulse"), 400);
    registrar(t);
  });
  U.$("#dFoto", root).addEventListener("change", async e => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    if (/^video\//.test(f.type) || /\.(mov|mp4|m4v|webm)$/i.test(f.name)) return enviarVideo(f);
    U.toast("Enviando foto…", 8000);
    try {
      const blob = await reduzir(f); const alvo = [...selPets][0] || pets[0]?.id;
      const path = await db.uploadFotoDiario(alvo, blob);
      const nota = await pedirTexto("Legenda da foto (opcional)", "Ex.: Hora do passeio na praia");
      const sel = selPets; selPets = new Set([alvo]); await registrar("foto", { foto_path: path, nota: nota || null }); selPets = sel;
    } catch { U.toast("Não consegui enviar a foto."); }
  });
  async function enviarVideo(f) {
    const alvo = [...selPets][0] || pets[0]?.id;
    U.toast("Preparando o vídeo… deixe a tela ligada", 60000);
    try {
      const v = await prepararVideo(f, pct => { const t = document.querySelector(".toast"); if (t) t.textContent = `Diminuindo o vídeo… ${pct}% (deixe a tela ligada)`; });
      U.toast(`Enviando o vídeo (${(v.blob.size / 1048576).toFixed(1)} MB)…`, 60000);
      const path = await db.uploadVideoDiario(alvo, v.blob, v.tipo, v.ext);
      const nota = await pedirTexto("Legenda do vídeo (opcional)", "Ex.: Correndo na praia");
      const sel = selPets; selPets = new Set([alvo]); await registrar("video", { foto_path: path, nota: nota || null }); selPets = sel;
    } catch (err) { U.toast(err.message && !/^(video|Failed)/.test(err.message) ? err.message : "Não consegui enviar o vídeo.", 6000); }
  }
  U.$("#dLista", root).addEventListener("click", async e => {
    if (e.target.closest("video")) return;
    const it = e.target.closest("[data-ids]"); if (!it) return; const ids = it.dataset.ids.split(",");
    const r = regs.find(x => x.id === ids[0]); if (!r) return;
    const hh = hora(r.criado_em);
    const m = U.modal(`<h3>${TIPOS[r.tipo]?.[0] || ""} ${TIPOS[r.tipo]?.[1] || r.tipo}</h3>
      <div class="row"><label class="f">Hora<input type="time" id="eHora" value="${hh}"></label></div>
      <label class="f">Observação<textarea id="eNota" rows="2">${U.esc(r.nota || "")}</textarea></label>
      <div class="acts"><button class="btn primary" data-salvar>Salvar</button><button class="btn danger" data-apagar>Apagar</button><button class="btn soft" data-close>Fechar</button></div>`);
    m.el.addEventListener("click", async ev => {
      if (ev.target.closest("[data-salvar]")) {
        const [h, mi] = m.el.querySelector("#eHora").value.split(":").map(Number); const d = new Date(r.criado_em); const base = U.pd(dia); base.setHours(h || d.getHours(), mi ?? d.getMinutes(), 0, 0);
        const row = { criado_em: base.toISOString(), nota: m.el.querySelector("#eNota").value.trim() || null };
        try { await Promise.all(ids.map(i => db.updateDiario(i, row))); regs.forEach(x => { if (ids.includes(x.id)) Object.assign(x, row); }); regs.sort((a, b) => a.criado_em.localeCompare(b.criado_em)); pintar(); m.close(); U.toast("Atualizado ✓"); }
        catch { U.toast("Não consegui salvar."); }
      } else if (ev.target.closest("[data-apagar]")) {
        try { await db.deleteDiario(ids); regs = regs.filter(x => !ids.includes(x.id)); pintar(); m.close(); U.toast("Apagado"); } catch { U.toast("Não consegui apagar."); }
      }
    });
  });
  const dp = U.$("#dPets", root);
  if (dp) dp.addEventListener("click", e => { const c = e.target.closest("[data-pet]"); if (!c) return; selPets.has(c.dataset.pet) ? selPets.delete(c.dataset.pet) : selPets.add(c.dataset.pet); c.classList.toggle("on"); });
  U.$("#dPrev", root).onclick = () => { dia = U.addDays(dia, -1); carregar(); };
  U.$("#dNext", root).onclick = () => { dia = U.addDays(dia, 1); carregar(); };
  U.$("#dRel", root).onclick = () => {
    const gs = agrupar(regs, petsById); if (!gs.length) { U.toast("Registre alguma coisa antes de mandar o resumo."); return; }
    const txt = relatorio(serv, pets, gs, dia); const comFoto = regs.filter(r => r.foto_path);
    const m = U.modal(`<h3>Resumo do dia</h3><pre>${U.esc(txt)}</pre>
      <div class="acts"><a class="btn wa" href="${U.waLink(serv.tutores?.whatsapp, txt)}" target="_blank" rel="noopener">${ic("conversa")} Mandar no WhatsApp</a>
      ${comFoto.length ? `<button class="btn soft" data-fotos>${ic("foto")} Compartilhar ${comFoto.length > 1 ? `as ${comFoto.length} fotos` : "a foto"}</button>` : ""}
      <button class="btn soft" data-copiar>${ic("copiar")} Copiar texto</button><button class="btn soft" data-close>Fechar</button></div>`);
    m.el.addEventListener("click", async ev => {
      if (ev.target.closest("[data-copiar]")) { await U.copyText(txt); U.toast("Texto copiado"); }
      if (ev.target.closest("[data-fotos]")) {
        try {
          const files = await Promise.all(comFoto.map(async (r, i) => new File([await db.fotoBlob(r.foto_path)], `pet-lar-${dia}-${i + 1}.jpg`, { type: "image/jpeg" })));
          if (navigator.canShare && navigator.canShare({ files })) await navigator.share({ files });
          else { for (const f of files) await U.shareOrDownload(f, f.name, "image/jpeg"); }
        } catch (err) { if (err?.name !== "AbortError") U.toast("Não consegui compartilhar as fotos."); }
      }
    });
  };
  carregar();
}
