// Pet Lar · área do tutor. Um app simples, em abas: Início, Diário, Fotos, Pets e Mais.
// O tutor entra pelo link pessoal que a Lari manda no WhatsApp (o código fica depois do #).
// Tudo passa pela Edge Function "portal", que só mostra o que é deste tutor.
import * as U from "./ui.js";
import { ic } from "./icones.js";

const FN = "https://jyzqcazwargpywjmayoh.supabase.co/functions/v1/portal";
const KEY = "sb_publishable_5VCBmavQviKh0GrvUWmp_A_3Z_HeARk";
const LARI_WHATS = "(47) 99917-9091";
const $ = s => document.querySelector(s);
const tela = $("#pt"), barra = $("#tabs");

const TIPOS = {
  comeu: ["comeu", "Comeu"], agua: ["agua", "Bebeu água"], passeio: ["passeio", "Passeou"], xixi: ["xixi", "Fez xixi"], coco: ["coco", "Fez cocô"],
  remedio: ["remedio", "Tomou o remédio"], dormiu: ["dormiu", "Dormiu"], brincou: ["brincou", "Brincou"], banho: ["banho", "Tomou banho"],
  chegou: ["chegou", "Chegou"], saiu: ["saiu", "Foi para casa"], foto: ["foto", "Foto"], video: ["video", "Vídeo"], nota: ["nota", "Recado da Lari"],
};
// o "dia do pet" na tela inicial: o básico que todo tutor quer saber
const ROTINA = [["comeu", "Comeu"], ["agua", "Água"], ["passeio", "Passeio"], ["xixi", "Xixi"], ["coco", "Cocô"], ["remedio", "Remédio"]];
// ficha do pet, em linguagem de conversa. Só 3 coisas são importantes para o dia a dia (imp);
// o resto é opcional e o tutor preenche se quiser. "rapidas" = respostas de um toque.
const CAMPOS_PET = [
  { k: "porte", l: "Porte", imp: true, tipo: "porte", sec: "sobre" },
  { k: "aniversario", l: "Aniversário", ph: "Se souber, a Lari lembra do dia", tipo: "aniv", sec: "sobre" },
  { k: "raca", l: "Raça", ph: "Ex.: Shih-tzu, Siamês", rapidas: ["SRD (sem raça definida)"], sec: "sobre" },
  { k: "idade", l: "Idade", ph: "Ex.: 3 anos, 8 meses", sec: "sobre", soSemAniv: true },
  { k: "alimentacao", l: "O que come", ph: "Ração, quantidade e horários", imp: true, area: true, sec: "rotina" },
  { k: "medicacao", l: "Remédios", ph: "Nome, dose e horário", imp: true, area: true, rapidas: ["Não toma remédio"], sec: "rotina" },
  { k: "comportamento", l: "Jeitinho", ph: "Medos, manias, como se dá com outros pets", area: true, sec: "mais" },
  { k: "limitacoes", l: "Saúde", ph: "Alergias, limitações, cirurgias", area: true, rapidas: ["Nenhum cuidado especial"], sec: "mais" },
  { k: "veterinario", l: "Veterinário", ph: "Nome e telefone", sec: "mais" },
  { k: "observacoes", l: "Sobre a casa", ph: "Chaves, portaria, onde ficam as coisas", area: true, sec: "mais" },
];
const SECOES_PET = [["sobre", "Sobre"], ["rotina", "Rotina"], ["mais", "Se quiser contar mais"]];
const campoPet = k => CAMPOS_PET.find(c => c.k === k);
// dados de contato do tutor
const CONTATO = [["whatsapp", "WhatsApp", "(47) 9 9999-9999", "tel", true], ["endereco", "Endereço", "Rua, número e complemento", "text", true], ["bairro", "Bairro", "", "text"], ["cidade", "Cidade", "Ex.: Balneário Camboriú", "text"], ["email", "E-mail", "seu@email.com", "email"]];
const PORTES = [["P", "Pequeno"], ["M", "Médio"], ["G", "Grande"], ["GG", "Gigante"]];
const ABAS = [["inicio", "casa", "Início"], ["diario", "diario", "Diário"], ["fotos", "foto", "Fotos"], ["pets", "pets", "Pets"], ["mais", "mais", "Mais"]];

// ---------- link (código) ----------
const ehToken = h => /^[A-Za-z0-9_-]{20,80}$/.test(h);
function pegarToken() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, "")).trim();
  if (ehToken(h)) { try { localStorage.setItem("petlar_tutor", h); } catch {} return h; }
  try { return localStorage.getItem("petlar_tutor"); } catch { return null; }
}
const TOKEN = pegarToken();

async function api(acao, extra = {}) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 30000);
  try {
    const r = await fetch(FN, { method: "POST", signal: ctrl.signal, headers: { "Content-Type": "application/json", apikey: KEY, Authorization: "Bearer " + KEY },
      body: JSON.stringify({ token: TOKEN, acao, ...extra }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(d.erro || "Não consegui carregar agora."); e.status = r.status; throw e; }
    return d;
  } catch (e) { if (e.name === "AbortError") throw new Error("A internet está lenta. Tente de novo."); throw e; }
  finally { clearTimeout(t); }
}

// ---------- estado e utilidades ----------
let D = null;                         // dados do tutor
let V = { aba: "inicio", sub: null }; // tela atual (sub = pet, orçamento ou dia)
let petSel = null;                    // pet em destaque no Início
const primeiro = n => String(n || "").trim().split(/\s+/)[0] || "";
const pet = id => D.pets.find(p => p.id === id);
const nomes = ids => { const ns = ids.map(id => pet(id)?.nome).filter(Boolean); return ns.length <= 1 ? (ns[0] || "seu pet") : ns.slice(0, -1).join(", ") + " e " + ns.at(-1); };
const hora = iso => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const diaLocal = iso => U.iso(new Date(iso));
const diaNome = d => { if (d === D.hoje) return "Hoje"; if (d === U.addDays(D.hoje, -1)) return "Ontem";
  return U.pd(d).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "").replace(/^./, c => c.toUpperCase()); };
const diaLongo = d => U.pd(d).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }).replace(/^./, c => c.toUpperCase());
const zap = (txt = "") => U.waLink(D?.contato?.whatsapp || LARI_WHATS, txt);
const fotoPet = p => p?.foto ? `<img src="${U.esc(p.foto)}" alt="">` : `<span class="pt-semfoto">${ic(p?.especie === "gato" ? "gato" : "cao")}</span>`;
const ehVideo = r => r.tipo === "video";
const midia = (r, cls = "") => ehVideo(r) ? `<video class="${cls}" src="${U.esc(r.foto)}#t=0.1" controls playsinline preload="metadata"></video>` : `<img class="${cls}" src="${U.esc(r.foto)}" alt="" loading="lazy">`;
const sinalDe = p => (p.pagamentos || []).find(g => /sinal/i.test(g.descricao)) || (p.pagamentos || [])[0];
const doDa = p => /a$/i.test(String(p?.nome || "").trim()) ? "da" : "do"; // "O dia do Bento", "O dia da Nina"

function grupos() {
  const h = D.hoje, ac = D.propostas.filter(p => p.status === "aceita" && p.data_inicio);
  return {
    abertas: D.propostas.filter(p => p.status === "enviada"),
    agora: ac.filter(p => p.data_inicio <= h && (p.data_fim || p.data_inicio) >= h),
    prox: ac.filter(p => p.data_inicio > h).sort((a, b) => a.data_inicio.localeCompare(b.data_inicio)),
    passadas: ac.filter(p => (p.data_fim || p.data_inicio) < h).sort((a, b) => b.data_inicio.localeCompare(a.data_inicio)),
    pix: ac.filter(p => { const s = sinalDe(p); return s && !s.pago_em && (p.data_fim || p.data_inicio) >= h; }),
  };
}

// ---------- navegação (o # guarda o código do link, então a aba vai no ?aba=) ----------
function ir(aba, sub = null, { trocar = false } = {}) {
  V = { aba, sub };
  const q = new URLSearchParams(); if (aba !== "inicio") q.set("aba", aba); if (sub) q.set("ver", sub);
  history[trocar ? "replaceState" : "pushState"](V, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash);
  pintar(); window.scrollTo(0, 0);
}
function lerUrl() { const q = new URLSearchParams(location.search); return { aba: q.get("aba") || "inicio", sub: q.get("ver") }; }
window.addEventListener("popstate", e => { V = e.state || lerUrl(); if (D && !D.precisa_aceite) pintar(); });

// ---------- telas de entrada ----------
function semBarra() { barra.hidden = true; barra.innerHTML = ""; document.body.classList.remove("com-abas"); }
function erro(msg, tentar = true) {
  semBarra();
  tela.className = "pt-main";
  tela.innerHTML = `<section class="pt-entrada"><img class="pt-logo" src="/assets/logo-petlar.webp" alt="Pet Lar">
    <h1>${tentar ? "Não carregou" : "Link sem acesso"}</h1><p>${U.esc(msg)}</p>
    ${tentar ? `<button class="pt-btn" id="ptDeNovo">Tentar de novo</button>` : ""}
    <a class="pt-btn pt-btn-2" href="${U.waLink(LARI_WHATS, "Oi, Lari! Meu link da Pet Lar não está abrindo.")}" target="_blank" rel="noopener">${ic("conversa")} Falar com a Lari</a></section>`;
  $("#ptDeNovo")?.addEventListener("click", carregar);
}
function aceite() {
  semBarra();
  tela.className = "pt-main";
  tela.innerHTML = `<section class="pt-entrada pt-boas">
    <img class="pt-logo" src="/assets/logo-petlar.webp" alt="Pet Lar">
    <h1>Oi, ${U.esc(primeiro(D.tutor.nome))}!</h1>
    <p>Este é o cantinho dos seus pets na Pet Lar.</p>
    <ul class="pt-lista">
      <li>${ic("foto")}<span>Fotos e o dia a dia deles com a Lari</span></li>
      <li>${ic("pdf")}<span>Orçamentos para confirmar e o Pix do sinal</span></li>
      <li>${ic("pets")}<span>A ficha de cada pet, sempre atualizada</span></li>
    </ul>
    <div class="pt-priv"><b>Sobre os seus dados</b><p>Guardamos seus dados e os dos seus pets (ficha, fotos e registros dos serviços) só para cuidar deles e falar com você. Não passamos para ninguém. Quando quiser, peça para a Lari apagar tudo.</p></div>
    <button class="pt-btn" id="ptOk">${ic("check")} Entendi, quero entrar</button>
    <p class="pt-nota">Este link é só seu. Não encaminhe para outras pessoas.</p></section>`;
  $("#ptOk").addEventListener("click", async e => {
    e.currentTarget.disabled = true;
    try { D = await api("aceite"); iniciar(); } catch (err) { erro(err.message); }
  });
}

// ---------- pedaços reutilizados ----------
function linhaTempo(regs) {
  const mostrarPet = D.pets.length > 1;
  return `<ol class="pt-tl">${regs.map(r => { const [i, t] = TIPOS[r.tipo] || ["nota", r.tipo]; const p = pet(r.pet_id);
    return `<li class="pt-tl-i${r.tipo === "nota" ? " recado" : ""}"><time>${hora(r.criado_em)}</time><span class="pt-tl-ic">${ic(i)}</span>
      <div class="pt-tl-t"><b>${t}</b>${mostrarPet && p ? `<span class="pt-tl-pet">${U.esc(p.nome)}</span>` : ""}
      ${r.nota ? `<p>${U.esc(r.nota)}</p>` : ""}
      ${r.foto ? (ehVideo(r) ? `<div class="pt-tl-foto">${midia(r)}</div>` : `<button class="pt-tl-foto" data-foto="${r.id}"><img src="${U.esc(r.foto)}" alt="Foto de ${U.esc(p?.nome || "seu pet")}" loading="lazy"></button>`) : ""}</div></li>`; }).join("")}</ol>`;
}
function cardServico(p) {
  const s = sinalDe(p); const falta = s && !s.pago_em; const d = U.pd(p.data_inicio);
  return `<article class="pt-serv">
    <div class="pt-serv-d"><b>${d.getDate()}</b><span>${d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span></div>
    <div class="pt-serv-t"><b>${U.esc(U.SERVICOS[p.servico] || "Serviço")}</b><span>${U.esc(nomes(p.pets))}, ${U.esc(U.periodo(p.data_inicio, p.data_fim))}</span>
    ${falta && D.pix ? `<button class="pt-link-a" data-pix="${p.id}">${ic("pix")} Pagar o sinal de ${U.brl2(s.valor)}</button>` : ""}</div></article>`;
}

// ---------- Início ----------
function inicio() {
  const g = grupos(), h = D.hoje;
  if (!petSel || !pet(petSel)) petSel = g.agora[0]?.pets?.[0] || D.pets[0]?.id || null;
  const p = pet(petSel);
  const servAgora = g.agora.find(x => x.pets.includes(petSel)) || null;
  const prox = g.prox.find(x => x.pets.includes(petSel)) || null;
  const regsHoje = D.diario.filter(r => diaLocal(r.criado_em) === h && (!petSel || r.pet_id === petSel)).sort((a, b) => a.criado_em.localeCompare(b.criado_em));
  const ultFoto = D.diario.find(r => r.foto && (!petSel || r.pet_id === petSel));
  const saud = (n => n < 12 ? "Bom dia" : n < 18 ? "Boa tarde" : "Boa noite")(new Date().getHours());
  const status = servAgora ? `<span class="pt-vivo" aria-hidden="true"></span>Com a Lari agora, até ${U.fmt(servAgora.data_fim || servAgora.data_inicio)}`
    : prox ? `Próximo cuidado em ${U.fmt(prox.data_inicio)}` : "Nenhum cuidado marcado";
  const rotina = ROTINA.filter(([k]) => k !== "remedio" || p?.medicacao || regsHoje.some(r => r.tipo === "remedio")).map(([k, l]) => {
    const r = [...regsHoje].reverse().find(x => x.tipo === k);
    return `<li class="${r ? "feito" : ""}"><span class="pt-rot-ic">${ic(r ? "check" : k)}</span><b>${l}</b><span>${r ? hora(r.criado_em) : "ainda não"}</span></li>`; }).join("");
  const ult = regsHoje.at(-1);

  return `<header class="pt-casa">
      <div class="pt-casa-top"><img class="pt-wm" src="/assets/wordmark.webp" alt="Pet Lar" width="92" height="21"><span>${saud}, ${U.esc(primeiro(D.tutor.nome))}</span></div>
      ${D.pets.length > 1 ? `<div class="pt-troca" role="tablist" aria-label="Escolher pet">${D.pets.map(x => `<button role="tab" aria-selected="${x.id === petSel}" class="${x.id === petSel ? "on" : ""}" data-petsel="${x.id}">${fotoPet(x)}<span>${U.esc(x.nome)}</span></button>`).join("")}</div>` : ""}
      <div class="pt-heroi">
        <div class="pt-heroi-foto">${fotoPet(p)}</div>
        <h1>${U.esc(p?.nome || "Seus pets")}</h1>
        <p class="pt-status${servAgora ? " agora" : ""}">${status}</p>
      </div>
    </header>
    <div class="pt-corpo">
    ${g.abertas.map(o => `<button class="pt-aviso" data-orc="${o.id}">${ic("pdf")}<span><b>Orçamento esperando sua resposta</b><small>${U.esc(o.resumo || U.SERVICOS[o.servico] || "")}</small></span>${ic("seta")}</button>`).join("")}
    ${servAgora || regsHoje.length ? `<section class="pt-bloco">
      <div class="pt-bloco-h"><h2>O dia ${doDa(p)} ${U.esc(p?.nome || "pet")}</h2><button class="pt-link-a" data-ir="diario">Ver o diário</button></div>
      <ul class="pt-rotina">${rotina}</ul>
      <p class="pt-ultimo">${ult ? `Último registro às ${hora(ult.criado_em)}: ${U.esc((TIPOS[ult.tipo] || ["", ult.tipo])[1].toLowerCase())}${ult.nota ? `. “${U.esc(ult.nota)}”` : "."}` : "A Lari ainda não registrou nada hoje. Aparece aqui assim que ela marcar."}</p>
    </section>` : ""}
    ${ultFoto ? `<section class="pt-bloco pt-ultfoto"><div class="pt-bloco-h"><h2>${ehVideo(ultFoto) ? "Vídeo" : "Foto"} mais recente</h2><button class="pt-link-a" data-ir="fotos">Ver todas</button></div>
      ${ehVideo(ultFoto) ? `<div class="pt-foto-g">${midia(ultFoto)}</div>` : `<button class="pt-foto-g" data-foto="${ultFoto.id}"><img src="${U.esc(ultFoto.foto)}" alt="" loading="lazy"></button>`}
      <p class="pt-legenda">${ultFoto.nota ? U.esc(ultFoto.nota) + ". " : ""}${diaNome(diaLocal(ultFoto.criado_em))}, ${hora(ultFoto.criado_em)}</p></section>` : ""}
    ${g.prox.length ? `<section class="pt-bloco"><div class="pt-bloco-h"><h2>Próximos cuidados</h2></div>${g.prox.slice(0, 3).map(cardServico).join("")}</section>` : ""}
    ${!g.agora.length && !g.prox.length && !g.abertas.length ? `<section class="pt-bloco pt-vazio"><p>Quando quiser marcar um cuidado, é só chamar a Lari.</p><a class="pt-btn" href="${zap("Oi, Lari! Queria ver uma data para ")}" target="_blank" rel="noopener">${ic("conversa")} Pedir um orçamento</a></section>` : ""}
    ${(() => { const n = faltando(); return n.total ? `<button class="pt-aviso leve" data-ir="${n.contato && !n.pets ? "mais" : "pets"}">${ic("nota")}<span><b>Complete o cadastro</b><small>Falta${n.total > 1 ? "m" : ""} ${n.total} informaç${n.total > 1 ? "ões" : "ão"}${n.pets ? " dos pets" : ""}${n.pets && n.contato ? " e" : ""}${n.contato ? " de contato" : ""}</small></span>${ic("seta")}</button>` : ""; })()}
    ${g.pix.map(o => `<button class="pt-aviso pix" data-pix="${o.id}">${ic("pix")}<span><b>Falta o sinal de ${U.brl2(sinalDe(o).valor)}</b><small>${U.esc(U.SERVICOS[o.servico] || "")}, ${U.esc(U.periodo(o.data_inicio, o.data_fim))}</small></span>${ic("seta")}</button>`).join("")}
    </div>`;
}

// o que ainda falta no cadastro (para o tutor completar)
function faltando() {
  const pets = D.pets.reduce((a, p) => a + faltaPet(p).length, 0);
  const contato = CONTATO.filter(c => c[4] && !D.tutor[c[0]]).length;
  return { pets, contato, total: pets + contato };
}

const faltaPet = p => CAMPOS_PET.filter(c => c.imp && !p[c.k]);
const valorPet = (p, c) => c.tipo === "porte" ? (PORTES.find(x => x[0] === p.porte) || [])[1] : c.tipo === "aniv" ? U.anivTexto(p.aniversario) : p[c.k];

// ---------- Diário ----------
function diario() {
  const dias = [...new Set(D.diario.map(r => diaLocal(r.criado_em)))].sort().reverse();
  if (!dias.length) return `<header class="pt-tit"><h1>Diário</h1></header><div class="pt-corpo"><section class="pt-bloco pt-vazio"><p>Cada vez que seu pet estiver com a Lari, ela registra aqui o que ele comeu, os passeios, as fotos e os recados.</p></section></div>`;
  const dia = dias.includes(V.sub) ? V.sub : dias[0];
  const regs = D.diario.filter(r => diaLocal(r.criado_em) === dia).sort((a, b) => a.criado_em.localeCompare(b.criado_em));
  return `<header class="pt-tit"><h1>Diário</h1></header>
    <div class="pt-dias" role="tablist" aria-label="Dias">${dias.slice(0, 40).map(d => `<button role="tab" aria-selected="${d === dia}" class="${d === dia ? "on" : ""}" data-dia="${d}">${diaNome(d)}</button>`).join("")}</div>
    <div class="pt-corpo"><section class="pt-bloco"><h2 class="pt-dia-t">${diaLongo(dia)}</h2>${linhaTempo(regs)}</section></div>`;
}

// ---------- Fotos ----------
function fotos() {
  const fs = D.diario.filter(r => r.foto);
  const nv = fs.filter(ehVideo).length, nf = fs.length - nv;
  return `<header class="pt-tit"><h1>Fotos</h1>${fs.length ? `<p>${[nf ? `${nf} foto${nf > 1 ? "s" : ""}` : "", nv ? `${nv} vídeo${nv > 1 ? "s" : ""}` : ""].filter(Boolean).join(" e ")} dos últimos 60 dias</p>` : ""}</header>
    <div class="pt-corpo">${fs.length ? `<div class="pt-grade">${fs.map(r => `<button data-foto="${r.id}" aria-label="Abrir ${ehVideo(r) ? "vídeo" : "foto"}">${ehVideo(r) ? `<video src="${U.esc(r.foto)}#t=0.1" muted playsinline preload="metadata"></video><span class="pt-play">${ic("play")}</span>` : `<img src="${U.esc(r.foto)}" alt="" loading="lazy">`}</button>`).join("")}</div>`
      : `<section class="pt-bloco pt-vazio"><p>As fotos que a Lari tirar dos seus pets aparecem aqui.</p></section>`}</div>`;
}
function verFoto(id) {
  const fs = D.diario.filter(r => r.foto); let i = Math.max(0, fs.findIndex(r => r.id === id));
  const bg = document.createElement("div"); bg.className = "pt-visor"; bg.setAttribute("role", "dialog"); bg.setAttribute("aria-modal", "true");
  const pintarV = () => { const r = fs[i]; const p = pet(r.pet_id);
    bg.innerHTML = `<div class="pt-visor-top"><button data-v="x" aria-label="Fechar">${ic("x")}</button><span>${i + 1} de ${fs.length}</span><button data-v="share" aria-label="Salvar ou compartilhar">${ic("enviar")}</button></div>
      <div class="pt-visor-img">${ehVideo(r) ? `<video src="${U.esc(r.foto)}" controls autoplay playsinline></video>` : `<img src="${U.esc(r.foto)}" alt="Foto de ${U.esc(p?.nome || "seu pet")}">`}</div>
      <div class="pt-visor-leg"><b>${U.esc(p?.nome || "")}</b>${r.nota ? `<p>${U.esc(r.nota)}</p>` : ""}<span>${diaNome(diaLocal(r.criado_em))}, ${hora(r.criado_em)}</span></div>
      ${fs.length > 1 ? `<button class="pt-visor-ant" data-v="ant" aria-label="Foto anterior">${ic("setaE")}</button><button class="pt-visor-prox" data-v="prox" aria-label="Próxima foto">${ic("seta")}</button>` : ""}`; };
  const mover = n => { i = (i + n + fs.length) % fs.length; pintarV(); };
  const fechar = () => { bg.remove(); document.removeEventListener("keydown", tecla); };
  const tecla = e => { if (e.key === "Escape") fechar(); if (e.key === "ArrowRight") mover(1); if (e.key === "ArrowLeft") mover(-1); };
  bg.addEventListener("click", e => { const b = e.target.closest("[data-v]"); if (!b) return; const v = b.dataset.v;
    if (v === "x") fechar(); else if (v === "prox") mover(1); else if (v === "ant") mover(-1); else if (v === "share") compartilharFoto(fs[i]); });
  let x0 = null; bg.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
  bg.addEventListener("touchend", e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50 && fs.length > 1) mover(dx < 0 ? 1 : -1); });
  document.addEventListener("keydown", tecla); pintarV(); document.body.appendChild(bg);
}
async function compartilharFoto(r) {
  const nome = `PetLar-${pet(r.pet_id)?.nome || "foto"}-${diaLocal(r.criado_em)}.${ehVideo(r) ? "mp4" : "jpg"}`;
  try {
    const blob = await (await fetch(r.foto)).blob(); const file = new File([blob], nome, { type: blob.type || "image/jpeg" });
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file] }); return; }
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: nome }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } catch (e) { if (e.name !== "AbortError") U.toast(ehVideo(r) ? "Não consegui salvar o vídeo. Abra o vídeo e use o botão de compartilhar dele." : "Não consegui salvar. Toque e segure a foto para salvar."); }
}

// ---------- Pets ----------
function pets() {
  if (V.sub && pet(V.sub)) return fichaPet(pet(V.sub));
  return `<header class="pt-tit"><h1>${D.pets.length > 1 ? "Seus pets" : "Seu pet"}</h1><p>Conte para a Lari o que souber. Nada é obrigatório.</p></header>
    <div class="pt-corpo">${D.pets.length ? `<div class="pt-pets">${D.pets.map(p => { const f = faltaPet(p);
      return `<button class="pt-petcard" data-pet="${p.id}"><span class="pt-petcard-f">${fotoPet(p)}</span>
        <span class="pt-petcard-t"><b>${U.esc(p.nome)}</b><small>${[p.especie === "gato" ? "Gato" : "Cão", p.raca, U.anivTexto(p.aniversario).replace(/^.*\((.*)\)$/, "$1") || p.idade].filter(Boolean).map(U.esc).join(", ")}</small>
        <em class="${f.length ? "falta" : "ok"}">${f.length ? `Ajude a Lari: ${f.map(c => c.l.toLowerCase()).join(", ")}` : "Ficha em dia"}</em></span>${ic("seta")}</button>`; }).join("")}</div>`
      : `<section class="pt-bloco pt-vazio"><p>Seus pets ainda não estão cadastrados. Fale com a Lari.</p></section>`}</div>`;
}
function linhaCampo(p, c) {
  const v = valorPet(p, c);
  return `<div class="pt-campo${c.imp && !v ? " pede" : ""}" data-campo="${c.k}">
    <div class="pt-campo-h"><b>${c.l}${c.imp && !v ? ' <span class="pt-imp">importante</span>' : ""}</b><button class="pt-link-a" data-editar="${c.k}" data-ent="pet">${v ? "Mudar" : "Contar"}</button></div>
    <p class="${v ? "" : "vazio"}">${v ? U.esc(v) : c.ph || "Toque em Contar"}</p></div>`;
}
function fichaPet(p) {
  const semNome = !String(p.nome || "").trim();
  return `<header class="pt-tit pt-tit-volta"><button class="pt-volta" data-ir="pets" aria-label="Voltar para os pets">${ic("setaE")}</button><h1>${U.esc(p.nome || "Seu pet")}</h1></header>
    <div class="pt-corpo">
    <div class="pt-ficha-foto">${fotoPet(p)}<button class="pt-btn pt-btn-2 pt-btn-p" data-trocafoto="${p.id}">${ic("camera")} ${p.foto ? "Trocar a foto" : "Pôr uma foto"}</button></div>
    <p class="pt-ficha-sub">Preencha só o que souber. O que estiver marcado como <b>importante</b> ajuda a Lari a cuidar ${/a$/i.test(p.nome || "") ? "dela" : "dele"} no dia a dia.</p>
    ${semNome ? `<section class="pt-bloco pt-ficha">${linhaCampo(p, { k: "nome", l: "Nome", ph: "Como ele se chama", imp: true })}</section>` : ""}
    ${SECOES_PET.map(([sec, t]) => { const cs = CAMPOS_PET.filter(c => c.sec === sec && !(c.soSemAniv && /^\d{4}/.test(p.aniversario || "")));
      return sec === "mais" ? `<details class="pt-bloco pt-ficha pt-mais"${cs.some(c => p[c.k]) ? " open" : ""}><summary><h2>${t}</h2><span>${cs.filter(c => p[c.k]).length} de ${cs.length}</span></summary>${cs.map(c => linhaCampo(p, c)).join("")}</details>`
        : `<section class="pt-bloco pt-ficha"><h2>${t}</h2>${cs.map(c => linhaCampo(p, c)).join("")}</section>`; }).join("")}
    ${p.atualizado_tutor_em ? `<p class="pt-nota">Você atualizou em ${U.fmtY(p.atualizado_tutor_em.slice(0, 10))}.</p>` : ""}</div>`;
}
function editarCampo(ent, k) {
  const el = tela.querySelector(`[data-campo="${k}"]`);
  let l, ph, tipo, area = false, rapidas = [], atual;
  if (ent === "tutor") { const c = CONTATO.find(f => f[0] === k); [, l, ph, tipo] = c; area = k === "endereco"; atual = D.tutor[k]; }
  else { const c = campoPet(k) || { k: "nome", l: "Nome", ph: "Como ele se chama" }; ({ l, ph = "", tipo, area = false, rapidas = [] } = c); atual = pet(V.sub)[k]; }
  const campo = tipo === "porte" ? `<div class="pt-portes" role="radiogroup">${PORTES.map(([v, t]) => `<label><input type="radio" name="v" value="${v}"${atual === v ? " checked" : ""}><span>${t}</span></label>`).join("")}</div>`
    : tipo === "aniv" ? `<div class="pt-aniv">${U.anivCampos(atual, "v")}</div>`
    : area ? `<textarea id="f_${k}" name="v" rows="3" maxlength="1000" placeholder="${ph}">${U.esc(atual || "")}</textarea>`
    : `<input id="f_${k}" name="v" type="${tipo || "text"}" ${tipo === "tel" ? 'inputmode="tel" autocomplete="tel"' : tipo === "email" ? 'autocomplete="email"' : ""} maxlength="${k === "nome" ? 40 : 100}" placeholder="${ph}" value="${U.esc(atual || "")}">`;
  el.innerHTML = `<form class="pt-edita" data-salvar="${k}" data-ent="${ent}" data-tipo="${tipo || ""}"><label for="f_${k}"><b>${l}</b></label>
    ${rapidas.length ? `<div class="pt-rapidas">${rapidas.map(r => `<button type="button" class="pt-rapida" data-rapida="${U.esc(r)}">${U.esc(r)}</button>`).join("")}</div>` : ""}${campo}
    <div class="pt-edita-a"><button class="pt-btn pt-btn-p" type="submit">Salvar</button><button class="pt-btn pt-btn-2 pt-btn-p" type="button" data-cancelar>Cancelar</button>${atual && tipo !== "porte" && k !== "nome" ? `<button class="pt-link-a" type="button" data-limpar>Apagar</button>` : ""}</div></form>`;
  const inp = el.querySelector("textarea, input[type=text], input[type=tel], input[type=email], input:not([type])"); if (inp) { inp.focus(); inp.setSelectionRange?.(inp.value.length, inp.value.length); }
}

// ---------- Mais (orçamentos, pagamentos, histórico, contato) ----------
function mais() {
  const sel = V.sub && D.propostas.find(p => p.id === V.sub); if (sel) return orcamento(sel);
  const g = grupos();
  const pagos = D.propostas.filter(p => p.status === "aceita" && (p.pagamentos || []).length);
  return `<header class="pt-tit"><h1>Mais</h1></header><div class="pt-corpo">
    ${g.abertas.length ? `<section class="pt-bloco"><h2>Orçamentos para responder</h2>${g.abertas.map(o => `<button class="pt-linha" data-orc="${o.id}">${ic("pdf")}<span><b>${U.esc(o.resumo || U.SERVICOS[o.servico] || "Orçamento")}</b><small>${o.opcoes?.length === 2 ? "Duas opções para escolher" : U.brl(o.valor_total)}</small></span>${ic("seta")}</button>`).join("")}</section>` : ""}
    ${g.agora.length || g.prox.length ? `<section class="pt-bloco"><h2>Cuidados confirmados</h2>${[...g.agora, ...g.prox].map(cardServico).join("")}</section>` : ""}
    ${pagos.length ? `<section class="pt-bloco"><h2>Pagamentos</h2>${pagos.slice(0, 8).map(o => `<div class="pt-pag"><b>${U.esc(U.SERVICOS[o.servico] || "")}, ${U.esc(U.periodo(o.data_inicio, o.data_fim))}</b>
      ${o.pagamentos.map(x => `<div class="pt-pag-l${x.pago_em ? " pago" : ""}"><span>${U.esc(x.descricao)}</span><span>${U.brl2(x.valor)}</span><em>${x.pago_em ? `pago em ${U.fmt(x.pago_em)}` : `vence ${U.fmt(x.vencimento)}`}</em></div>`).join("")}
      ${o.pagamentos.some(x => !x.pago_em) && D.pix ? `<button class="pt-link-a" data-pix="${o.id}">${ic("pix")} Pagar com Pix</button>` : ""}</div>`).join("")}</section>` : ""}
    ${g.passadas.length ? `<section class="pt-bloco"><h2>Cuidados anteriores</h2>${g.passadas.slice(0, 12).map(o => `<div class="pt-hist">
      <span><b>${U.esc(U.SERVICOS[o.servico] || "")}</b><small>${U.esc(nomes(o.pets))}, ${U.esc(U.periodo(o.data_inicio, o.data_fim))}</small></span>
      ${o.avaliacao ? `<span class="pt-estrelas" aria-label="Você deu ${o.avaliacao.nota} de 5">${[1, 2, 3, 4, 5].map(n => `<i class="${n <= o.avaliacao.nota ? "s" : ""}">${ic("estrela")}</i>`).join("")}</span>`
        : `<button class="pt-btn pt-btn-2 pt-btn-p" data-avaliar="${o.id}">${ic("estrela")} Avaliar</button>`}</div>`).join("")}</section>` : ""}
    <section class="pt-bloco pt-ficha" id="seusDados"><h2>Seus dados</h2>${CONTATO.map(([k, l, ph, , imp]) => `<div class="pt-campo${imp && !D.tutor[k] ? " pede" : ""}" data-campo="${k}">
      <div class="pt-campo-h"><b>${l}${imp && !D.tutor[k] ? ' <span class="pt-imp">importante</span>' : ""}</b><button class="pt-link-a" data-editar="${k}" data-ent="tutor">${D.tutor[k] ? "Mudar" : "Contar"}</button></div>
      <p class="${D.tutor[k] ? "" : "vazio"}">${D.tutor[k] ? U.esc(D.tutor[k]) : (ph || "Toque em Preencher")}</p></div>`).join("")}</section>
    <section class="pt-bloco">
      <a class="pt-linha" href="${zap("Oi, Lari! ")}" target="_blank" rel="noopener">${ic("conversa")}<span><b>Falar com a Lari</b><small>Pelo WhatsApp</small></span>${ic("seta")}</a>
      ${D.contato?.instagram ? `<a class="pt-linha" href="https://instagram.com/${U.esc(D.contato.instagram.replace(/^@/, ""))}" target="_blank" rel="noopener">${ic("coracao")}<span><b>Instagram da Pet Lar</b><small>${U.esc(D.contato.instagram)}</small></span>${ic("seta")}</a>` : ""}
      <button class="pt-linha" id="ptSalvar">${ic("casa")}<span><b>Deixar na tela do celular</b><small>Para abrir com um toque, como um app</small></span>${ic("seta")}</button>
      <button class="pt-linha" id="ptDados">${ic("olho")}<span><b>Privacidade</b><small>Como cuidamos das suas informações</small></span>${ic("seta")}</button>
    </section>
    <p class="pt-nota">Este link é só seu. Não encaminhe para outras pessoas.</p></div>`;
}
function orcamento(p) {
  const ops = Array.isArray(p.opcoes) && p.opcoes.length === 2 ? p.opcoes : null;
  const aberto = p.status === "enviada";
  const vencida = aberto && p.validade_ate && p.validade_ate < D.hoje;
  const rec = Number(p.escolhida || p.recomendada) || 1;
  return `<header class="pt-tit pt-tit-volta"><button class="pt-volta" data-ir="mais" aria-label="Voltar">${ic("setaE")}</button><h1>Orçamento</h1></header>
    <div class="pt-corpo"><section class="pt-bloco pt-orc">
      <p class="pt-orc-num">${U.esc(p.numero || "")}${p.validade_ate && aberto ? `, vale até ${U.fmt(p.validade_ate)}` : ""}</p>
      <h2>${U.esc(p.resumo || U.SERVICOS[p.servico] || "Proposta")}</h2>
      ${vencida ? `<p class="pt-alerta">${ic("relogio")} Este orçamento venceu. Fale com a Lari para ver se as datas ainda estão livres.</p>` : ""}
      ${ops ? `<p>A Lari preparou duas opções. Escolha a que fica melhor para você.</p>
        <div class="pt-ops">${ops.map(o => `<div class="pt-op${o.n === rec ? " rec" : ""}">
          <span class="pt-op-n">Opção ${o.n}${o.n === rec ? (p.escolhida ? ", a escolhida" : ", a que a Lari recomenda") : ""}</span>
          <b>${U.esc(o.titulo || U.SERVICOS[o.servico] || "")}</b>
          <span>${o.pets?.length ? "Para " + U.esc(o.pets.join(" e ")) + ". " : ""}${o.data_inicio ? U.esc(U.periodo(o.data_inicio, o.data_fim)) : ""}</span>
          <strong>${U.brl(o.valor_total)}</strong>
          ${aberto ? `<button class="pt-btn" data-aceitar="${p.id}" data-op="${o.n}">Quero a opção ${o.n}</button>` : ""}</div>`).join("")}</div>`
      : `<div class="pt-orc-v"><span>${U.esc(U.SERVICOS[p.servico] || "Serviço")} para ${U.esc(nomes(p.pets))}${p.data_inicio ? `, ${U.esc(U.periodo(p.data_inicio, p.data_fim))}` : ""}</span>
          <strong>${U.brl(p.valor_total)}</strong>${p.valor_cheio > p.valor_total ? `<s>${U.brl(p.valor_cheio)}</s>` : ""}</div>
        ${aberto ? `<p>Para garantir as datas, o sinal é de <b>${U.brl2(p.valor_total / 2)}</b> (metade). O restante fica para o fim do cuidado.</p>
        <button class="pt-btn" data-aceitar="${p.id}">${ic("check")} Quero confirmar</button>` : ""}`}
      ${p.obs ? `<div class="pt-recado"><b>Recado da Lari</b><p>${U.esc(p.obs)}</p></div>` : ""}
      <a class="pt-btn pt-btn-2" href="${zap(`Oi, Lari! Tenho uma dúvida sobre o orçamento ${p.numero || ""}.`)}" target="_blank" rel="noopener">${ic("conversa")} Tirar uma dúvida</a>
    </section></div>`;
}

// ---------- pintar ----------
function pintar() {
  if (D.precisa_aceite) return aceite();
  barra.hidden = false; document.body.classList.add("com-abas");
  const ab = ABAS.some(a => a[0] === V.aba) ? V.aba : "inicio";
  const n = grupos().abertas.length;
  const temMidia = D.diario.some(r => r.foto); // fotos e vídeos vão pelo WhatsApp por enquanto: sem mídia, a aba Fotos some
  barra.innerHTML = ABAS.filter(([k]) => k !== "fotos" || temMidia || ab === "fotos").map(([k, i, l]) => `<button class="${k === ab ? "on" : ""}" data-ir="${k}"${k === ab ? ' aria-current="page"' : ""}>${ic(i)}<span>${l}</span>${k === "mais" && n ? `<i class="pt-ponto" aria-label="${n} orçamento para responder"></i>` : ""}</button>`).join("");
  tela.className = "pt-main aba-" + ab;
  tela.innerHTML = ({ inicio, diario, fotos, pets, mais })[ab]();
}

// ---------- ações ----------
async function confirmarProposta(id, op) {
  const p = D.propostas.find(x => x.id === id); if (!p) return;
  const o = op ? p.opcoes.find(x => x.n === op) : null; const valor = o ? o.valor_total : p.valor_total;
  const ok = await U.confirmDialog(`Confirmar ${o ? `a opção ${o.n} (${o.titulo || U.SERVICOS[o.servico] || ""})` : "o orçamento"} de ${U.brl(valor)}? Depois é só pagar o sinal de ${U.brl2(valor / 2)} pelo Pix.`, { ok: "Sim, quero confirmar" });
  if (!ok) return;
  try {
    D = await api("aceitar", { proposta_id: id, opcao: op || null }); ir("inicio", null, { trocar: true });
    const novo = D.propostas.find(x => x.id === id);
    if (novo && D.pix) verPix(novo); else U.toast("Confirmado! A Lari já foi avisada.", 4500);
  } catch (e) { U.toast(e.message, 4500); }
}
async function verPix(p) {
  const s = (p.pagamentos || []).find(g => !g.pago_em && /sinal/i.test(g.descricao)) || (p.pagamentos || []).find(g => !g.pago_em); if (!s || !D.pix) return;
  const { pixPayload, pixQR } = await import("./pix.js");
  const payload = pixPayload({ chave: D.pix.chave, nome: D.pix.nome, cidade: D.pix.cidade, valor: Number(s.valor), txid: (p.numero || "PETLAR").replace(/\W/g, "") });
  const qr = await pixQR(payload, 5).catch(() => null);
  const m = U.modal(`<h3>Pix do ${U.esc(/sinal/i.test(s.descricao) ? "sinal" : "saldo")}: ${U.brl2(s.valor)}</h3>
    <ol class="pt-passos"><li>Toque em <b>Copiar código Pix</b>.</li><li>No app do seu banco, escolha <b>Pix copia e cola</b>.</li><li>Cole o código e confirme.</li></ol>
    ${qr ? `<img class="pt-qr" src="${qr}" alt="QR Code do Pix">` : ""}
    <div class="acts"><button class="pt-btn" data-copiar>${ic("copiar")} Copiar código Pix</button>
    <a class="pt-btn pt-btn-2" href="${zap(`Oi, Lari! Paguei o Pix de ${U.brl2(s.valor)} do orçamento ${p.numero || ""}. Segue o comprovante:`)}" target="_blank" rel="noopener">${ic("conversa")} Mandar o comprovante</a>
    <button class="pt-btn pt-btn-2" data-close>Fechar</button></div>`);
  m.el.classList.add("pt-modal");
  m.el.querySelector("[data-copiar]").addEventListener("click", async () => { await U.copyText(payload); U.toast("Código Pix copiado. Agora cole no app do banco.", 4500); });
}
function reduzir(file, max = 1280) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onerror = rej;
    r.onload = () => { const img = new Image(); img.onerror = () => rej(new Error("Não consegui abrir essa foto.")); img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL("image/jpeg", .85)); }; img.src = r.result; };
    r.readAsDataURL(file); });
}
function avaliar(id) {
  const p = D.propostas.find(x => x.id === id); let nota = 0;
  const m = U.modal(`<h3>Como foi o cuidado com ${U.esc(nomes(p.pets))}?</h3>
    <div class="pt-estrelas pt-escolher">${[1, 2, 3, 4, 5].map(n => `<button data-n="${n}" aria-label="${n} de 5">${ic("estrela")}</button>`).join("")}</div>
    <label class="pt-f"><span>Quer contar algo para a Lari? (opcional)</span><textarea rows="3" maxlength="1000"></textarea></label>
    <div class="acts"><button class="pt-btn" data-env disabled>Enviar</button><button class="pt-btn pt-btn-2" data-close>Agora não</button></div>`);
  m.el.classList.add("pt-modal");
  m.el.querySelector(".pt-escolher").addEventListener("click", e => { const b = e.target.closest("[data-n]"); if (!b) return; nota = Number(b.dataset.n);
    m.el.querySelectorAll(".pt-escolher button").forEach(x => x.classList.toggle("s", Number(x.dataset.n) <= nota)); m.el.querySelector("[data-env]").disabled = false; });
  m.el.querySelector("[data-env]").addEventListener("click", async e => {
    const b = e.currentTarget; b.disabled = true; const comentario = m.el.querySelector("textarea").value;
    try { await api("avaliar", { proposta_id: id, nota, comentario }); p.avaliacao = { nota, comentario }; m.close(); pintar(); U.toast("Obrigada! A Lari vai adorar ler.", 4000); }
    catch (err) { b.disabled = false; U.toast(err.message); }
  });
}
function comoSalvar() {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const m = U.modal(`<h3>Deixar na tela do celular</h3>${ios
    ? `<ol class="pt-passos"><li>No Safari, toque em <b>Compartilhar</b> (o quadrado com a seta para cima).</li><li>Escolha <b>Adicionar à Tela de Início</b>.</li><li>Toque em <b>Adicionar</b>.</li></ol>`
    : `<ol class="pt-passos"><li>No Chrome, toque nos <b>três pontinhos</b> lá em cima.</li><li>Escolha <b>Adicionar à tela inicial</b>.</li><li>Toque em <b>Adicionar</b>.</li></ol>`}
    <p>Pronto: a Pet Lar vira um ícone no seu celular. Se perder o link, peça outro para a Lari.</p><div class="acts"><button class="pt-btn pt-btn-2" data-close>Entendi</button></div>`);
  m.el.classList.add("pt-modal");
}
function seusDados() {
  const m = U.modal(`<h3>Privacidade</h3><p>Guardamos seus dados e os dos seus pets (ficha, fotos e registros dos serviços) só para cuidar deles e falar com você. Não passamos para ninguém.</p>
    <p>Quer apagar tudo ou corrigir algo? É só pedir para a Lari.</p>
    <div class="acts"><a class="pt-btn pt-btn-2" href="${zap("Oi, Lari! Queria falar sobre os meus dados na Pet Lar.")}" target="_blank" rel="noopener">${ic("conversa")} Falar com a Lari</a><button class="pt-btn pt-btn-2" data-close>Fechar</button></div>`);
  m.el.classList.add("pt-modal");
}

document.addEventListener("click", e => {
  if (!D || D.precisa_aceite || e.target.closest(".pt-visor, .modal-bg")) return;
  const t = e.target;
  const irB = t.closest("[data-ir]"); if (irB) return ir(irB.dataset.ir);
  const ps = t.closest("[data-petsel]"); if (ps) { petSel = ps.dataset.petsel; return pintar(); }
  const dia = t.closest("[data-dia]"); if (dia) return ir("diario", dia.dataset.dia, { trocar: true });
  const orc = t.closest("[data-orc]"); if (orc) return ir("mais", orc.dataset.orc);
  const pc = t.closest("[data-pet]"); if (pc) return ir("pets", pc.dataset.pet);
  const ac = t.closest("[data-aceitar]"); if (ac) return confirmarProposta(ac.dataset.aceitar, ac.dataset.op ? Number(ac.dataset.op) : null);
  const px = t.closest("[data-pix]"); if (px) return verPix(D.propostas.find(x => x.id === px.dataset.pix));
  const fo = t.closest("[data-foto]"); if (fo) return verFoto(fo.dataset.foto);
  const av = t.closest("[data-avaliar]"); if (av) return avaliar(av.dataset.avaliar);
  if (t.closest("#ptSalvar")) return comoSalvar();
  if (t.closest("#ptDados")) return seusDados();
  const ed = t.closest("[data-editar]"); if (ed) return editarCampo(ed.dataset.ent || "pet", ed.dataset.editar);
  if (t.closest("[data-cancelar]")) return pintar();
  const tf = t.closest("[data-trocafoto]"); if (tf) {
    const inp = Object.assign(document.createElement("input"), { type: "file", accept: "image/*" });
    inp.addEventListener("change", async () => { const file = inp.files[0]; if (!file) return;
      tf.disabled = true; tf.textContent = "Enviando…";
      try { const imagem = await reduzir(file); const r = await api("foto", { pet_id: tf.dataset.trocafoto, imagem }); pet(tf.dataset.trocafoto).foto = r.foto; pintar(); U.toast("Foto nova salva!"); }
      catch (err) { pintar(); U.toast(err.message || "Não consegui enviar a foto."); } });
    inp.click();
  }
});
async function salvarCampo(f, v) {
  const k = f.dataset.salvar, ent = f.dataset.ent;
  const b = f.querySelector("[type=submit]"); b.disabled = true;
  try {
    if (ent === "tutor") { await api("tutor", { campos: { [k]: v } }); D.tutor[k] = v || null; }
    else { const id = V.sub; await api("ficha", { pet_id: id, campos: { [k]: v } }); Object.assign(pet(id), { [k]: v || null, atualizado_tutor_em: new Date().toISOString() }); }
    pintar(); U.toast(v ? "Salvo. A Lari já vê a novidade." : "Apagado.");
  } catch (err) { b.disabled = false; U.toast(err.message); }
}
document.addEventListener("submit", e => {
  const f = e.target.closest("[data-salvar]"); if (!f) return; e.preventDefault();
  const k = f.dataset.salvar, fd = new FormData(f);
  const v = f.dataset.tipo === "aniv" ? U.anivDoForm(fd, "v") : String(fd.get("v") ?? "").trim();
  if (k === "porte" && !v) return U.toast("Escolha o porte.");
  if (k === "nome" && !v) return U.toast("Escreva o nome.");
  if (f.dataset.tipo === "aniv" && !v) return U.toast("Escolha a data.");
  salvarCampo(f, v);
});
document.addEventListener("click", e => {
  const r = e.target.closest("[data-rapida]"); if (r) { salvarCampo(r.closest("form"), r.dataset.rapida); return; }
  const lp = e.target.closest("[data-limpar]"); if (lp) salvarCampo(lp.closest("form"), "");
});

function iniciar() { V = lerUrl(); history.replaceState(V, "", location.href); pintar(); }
async function carregar() {
  if (!TOKEN) return erro("Para entrar, use o link que a Lari mandou no seu WhatsApp.", false);
  tela.innerHTML = `<div class="pt-carregando"><div class="sk" style="height:44vh;border-radius:0 0 48px 48px"></div><div class="sk" style="height:90px;margin:18px;border-radius:22px"></div></div>`;
  try { D = await api("dados"); iniciar(); }
  catch (e) { if (e.status === 401) { try { localStorage.removeItem("petlar_tutor"); } catch {} return erro(e.message, false); } erro(e.message); }
}
carregar();
// abriu outro link com a página já aberta: recarrega com o código novo
window.addEventListener("hashchange", () => { const h = decodeURIComponent(location.hash.replace(/^#\/?/, "")).trim(); if (ehToken(h) && h !== TOKEN) location.reload(); });
