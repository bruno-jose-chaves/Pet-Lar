// Pet Lar · área do tutor (portal). O tutor entra pelo link pessoal que a Lari manda no WhatsApp.
// O link guarda um código (depois do #). Tudo passa pela Edge Function "portal", que só mostra o que é deste tutor.
import * as U from "./ui.js";
import { ic } from "./icones.js";

const FN = "https://jyzqcazwargpywjmayoh.supabase.co/functions/v1/portal";
const KEY = "sb_publishable_5VCBmavQviKh0GrvUWmp_A_3Z_HeARk";
const $ = s => document.querySelector(s);
const root = $("#pt");

const TIPOS = {
  comeu: ["comeu", "Comeu"], agua: ["agua", "Bebeu água"], passeio: ["passeio", "Passeou"], xixi: ["xixi", "Fez xixi"], coco: ["coco", "Fez cocô"],
  remedio: ["remedio", "Tomou o remédio"], dormiu: ["dormiu", "Dormiu"], brincou: ["brincou", "Brincou"], banho: ["banho", "Tomou banho"],
  chegou: ["chegou", "Chegou"], saiu: ["saiu", "Foi para casa"], foto: ["foto", "Foto"], nota: ["nota", "Recado da Lari"],
};
const FICHA = [["alimentacao", "Alimentação", "Ração, quantidade e horários"], ["medicacao", "Remédios", "Nome, dose e horário"],
  ["comportamento", "Jeitinho e comportamento", "Medos, manias, como se dá com outros pets"], ["limitacoes", "Saúde e cuidados especiais", "Alergias, limitações, cirurgias"],
  ["veterinario", "Veterinário", "Nome e telefone"], ["observacoes", "Outras informações", "Chaves, portaria, onde ficam as coisas…"]];

// ---------- link (código) ----------
function pegarToken() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, "")).trim();
  if (/^[A-Za-z0-9_-]{20,80}$/.test(h)) { try { localStorage.setItem("petlar_tutor", h); } catch {} return h; }
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

let D = null; // dados do tutor
const primeiro = n => String(n || "").trim().split(/\s+/)[0] || "";
const nomes = ids => { const ns = ids.map(id => D.pets.find(p => p.id === id)?.nome).filter(Boolean); return ns.length <= 1 ? (ns[0] || "seu pet") : ns.slice(0, -1).join(", ") + " e " + ns.at(-1); };
const hora = iso => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const diaLocal = iso => U.iso(new Date(iso));
const diaExtenso = d => { const h = D.hoje; if (d === h) return "Hoje"; if (d === U.addDays(h, -1)) return "Ontem";
  return U.pd(d).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }).replace(/^./, c => c.toUpperCase()); };
const zap = (txt = "") => U.waLink(D?.contato?.whatsapp || "(47) 99917-9091", txt);

// ---------- telas ----------
function erro(msg, tentar = true) {
  root.innerHTML = `<section class="pt-card pt-center"><div class="pt-ic-big">${ic("aviso")}</div><h1 class="pt-h1">Ops!</h1><p class="pt-p">${U.esc(msg)}</p>
    ${tentar ? `<button class="btn primary pt-big" id="ptDeNovo">Tentar de novo</button>` : ""}
    <a class="btn soft pt-big" href="${U.waLink("(47) 99917-9091", "Oi, Lari! Meu link da Pet Lar não está abrindo.")}" target="_blank" rel="noopener">${ic("conversa")} Falar com a Lari</a></section>`;
  $("#ptDeNovo")?.addEventListener("click", carregar);
}

function aceite() {
  root.innerHTML = `<section class="pt-card pt-boas">
    <p class="pt-eyebrow">Área do tutor</p>
    <h1 class="pt-h1">Oi, ${U.esc(primeiro(D.tutor.nome))}!</h1>
    <p class="pt-p">Este é o cantinho dos seus pets na Pet Lar. Por aqui você:</p>
    <ul class="pt-lista">
      <li>${ic("foto")}<span>vê as <b>fotos</b> e o <b>diário</b> de cada dia com a Lari</span></li>
      <li>${ic("pdf")}<span>confirma <b>orçamentos</b> e paga o sinal pelo Pix</span></li>
      <li>${ic("pets")}<span>atualiza a <b>ficha</b> e a foto dos seus pets</span></li>
    </ul>
    <div class="pt-priv"><b>Sobre os seus dados</b><p>Guardamos seus dados e os dos seus pets (ficha, fotos e registros dos serviços) só para cuidar deles e falar com você.
      Não passamos para ninguém. Quando quiser, é só pedir para a Lari apagar tudo.</p></div>
    <button class="btn primary pt-big" id="ptOk">${ic("check")} Entendi, quero entrar</button>
    <p class="pt-mini">Este link é só seu. Não encaminhe para outras pessoas.</p></section>`;
  $("#ptOk").addEventListener("click", async e => {
    e.currentTarget.disabled = true;
    try { D = await api("aceite"); pintar(); } catch (err) { erro(err.message); }
  });
}

function cartaoProposta(p) {
  const ops = Array.isArray(p.opcoes) && p.opcoes.length === 2 ? p.opcoes : null;
  const vencida = p.validade_ate && p.validade_ate < D.hoje;
  const rec = Number(p.escolhida || p.recomendada) || 1;
  const corpo = ops ? `<p class="pt-p">Preparei <b>duas opções</b> para ${U.esc(nomes(p.pets))}. Escolha a que fica melhor para você:</p>
      <div class="pt-ops">${ops.map(o => `<button class="pt-op ${o.n === rec ? "rec" : ""}" data-aceitar="${p.id}" data-op="${o.n}">
        <span class="pt-op-n">Opção ${o.n}${o.n === rec ? " · recomendada" : ""}</span>
        <b>${U.esc(o.titulo || U.SERVICOS[o.servico] || "")}</b>
        <span>${o.data_inicio ? U.esc(U.periodo(o.data_inicio, o.data_fim)) : ""}</span>
        <span class="pt-op-v">${U.brl(o.valor_total)}</span><span class="pt-op-cta">Quero esta</span></button>`).join("")}</div>`
    : `<div class="pt-prop-v"><span>${U.esc(U.SERVICOS[p.servico] || "Serviço")}${p.data_inicio ? " · " + U.esc(U.periodo(p.data_inicio, p.data_fim)) : ""}</span>
        <b>${U.brl(p.valor_total)}</b>${p.valor_cheio > p.valor_total ? `<s>${U.brl(p.valor_cheio)}</s>` : ""}</div>
      <p class="pt-p">Para ${U.esc(nomes(p.pets))}. O sinal de <b>${U.brl2(p.valor_total / 2)}</b> (50%) garante as datas; o restante é no fim do serviço.</p>
      <button class="btn primary pt-big" data-aceitar="${p.id}">${ic("check")} Quero confirmar</button>`;
  return `<article class="pt-card pt-prop"><p class="pt-eyebrow">Orçamento ${U.esc(p.numero || "")}</p>
    <h2 class="pt-h2">${U.esc(p.resumo || U.SERVICOS[p.servico] || "Proposta")}</h2>
    ${vencida ? `<p class="pt-aviso">${ic("relogio")} Este orçamento venceu em ${U.fmt(p.validade_ate)}. Fale com a Lari para ver se as datas ainda estão livres.</p>` : ""}
    ${corpo}
    <a class="btn soft pt-big" href="${zap(`Oi, Lari! Tenho uma dúvida sobre o orçamento ${p.numero || ""}.`)}" target="_blank" rel="noopener">${ic("conversa")} Tirar uma dúvida</a></article>`;
}

function pixBloco(p) {
  const sinal = (p.pagamentos || []).find(g => /sinal/i.test(g.descricao)) || (p.pagamentos || [])[0];
  if (!sinal || sinal.pago_em || !D.pix) return "";
  return `<div class="pt-pix" data-pix="${p.id}" data-valor="${sinal.valor}" data-num="${U.esc(p.numero || "")}">
    <b>Falta o sinal: ${U.brl2(sinal.valor)}</b><p>Pague pelo Pix para garantir as datas.</p>
    <button class="btn primary pt-big" data-verpix="${p.id}">${ic("pix")} Pagar o sinal com Pix</button></div>`;
}

function linhaTempo(regs) {
  return `<div class="pt-tl">${regs.map(r => { const [i, t] = TIPOS[r.tipo] || ["nota", r.tipo];
    const pet = D.pets.find(p => p.id === r.pet_id)?.nome;
    return `<div class="pt-tl-i"><span class="pt-tl-h">${hora(r.criado_em)}</span><span class="pt-tl-ic">${ic(i)}</span>
      <div class="pt-tl-t"><b>${t}</b>${pet && D.pets.length > 1 ? ` <span class="pt-muted">· ${U.esc(pet)}</span>` : ""}${r.nota ? `<p>${U.esc(r.nota)}</p>` : ""}
      ${r.foto ? `<button class="pt-foto" data-foto="${U.esc(r.foto)}"><img src="${U.esc(r.foto)}" alt="Foto de ${U.esc(pet || "seu pet")}" loading="lazy"></button>` : ""}</div></div>`; }).join("")}</div>`;
}

function pintar() {
  if (D.precisa_aceite) return aceite();
  const h = D.hoje;
  const abertas = D.propostas.filter(p => p.status === "enviada");
  const aceitas = D.propostas.filter(p => p.status === "aceita");
  const agora = aceitas.filter(p => p.data_inicio && p.data_inicio <= h && (p.data_fim || p.data_inicio) >= h);
  const prox = aceitas.filter(p => p.data_inicio && p.data_inicio > h).sort((a, b) => a.data_inicio.localeCompare(b.data_inicio));
  const passadas = aceitas.filter(p => p.data_inicio && (p.data_fim || p.data_inicio) < h);
  const regsHoje = D.diario.filter(r => diaLocal(r.criado_em) === h).sort((a, b) => a.criado_em.localeCompare(b.criado_em));
  const dias = [...new Set(D.diario.map(r => diaLocal(r.criado_em)))].filter(d => d !== h).sort().reverse();
  const fotos = D.diario.filter(r => r.foto);
  const saud = (n => n < 12 ? "Bom dia" : n < 18 ? "Boa tarde" : "Boa noite")(new Date().getHours());

  root.innerHTML = `<h1 class="pt-h1 pt-ola">${saud}, ${U.esc(primeiro(D.tutor.nome))}!</h1>
    <nav class="pt-atalhos" aria-label="Atalhos">
      ${abertas.length ? `<a href="#orcamentos">${ic("pdf")}<span>Orçamentos</span></a>` : ""}
      <a href="#diario">${ic("diario")}<span>Diário</span></a><a href="#fotos">${ic("foto")}<span>Fotos</span></a>
      <a href="#pets">${ic("pets")}<span>Meus pets</span></a></nav>

    ${abertas.length ? `<section id="orcamentos"><h2 class="pt-sec">Para você responder</h2>${abertas.map(cartaoProposta).join("")}</section>` : ""}

    ${agora.map(p => `<section class="pt-card pt-agora"><p class="pt-eyebrow">Agora com a Lari</p>
      <div class="pt-agora-h">${p.pets.map(id => { const pet = D.pets.find(x => x.id === id); return `<span class="pt-av">${pet?.foto ? `<img src="${U.esc(pet.foto)}" alt="">` : ic("pets")}</span>`; }).join("")}
      <div><h2 class="pt-h2">${U.esc(nomes(p.pets))}</h2><p class="pt-muted">${U.esc(U.SERVICOS[p.servico] || "")} · ${U.esc(U.periodo(p.data_inicio, p.data_fim))}</p></div></div>
      ${pixBloco(p)}</section>`).join("")}

    <section id="diario"><h2 class="pt-sec">Diário de hoje</h2>
      ${regsHoje.length ? `<div class="pt-card">${linhaTempo(regsHoje)}</div>` : `<div class="pt-card pt-vazio">${agora.length ? "A Lari ainda não registrou nada hoje. As novidades aparecem aqui ao longo do dia." : "Nenhum serviço hoje. Quando seu pet estiver com a Lari, o dia dele aparece aqui."}</div>`}
      ${dias.length ? `<details class="pt-dias"><summary>Ver dias anteriores (${dias.length})</summary>${dias.slice(0, 30).map(d => `<div class="pt-dia"><h3 class="pt-h3">${diaExtenso(d)}</h3><div class="pt-card">${linhaTempo(D.diario.filter(r => diaLocal(r.criado_em) === d).sort((a, b) => a.criado_em.localeCompare(b.criado_em)))}</div></div>`).join("")}</details>` : ""}
    </section>

    ${prox.length ? `<section><h2 class="pt-sec">Próximos serviços</h2>${prox.map(p => `<article class="pt-card pt-prox"><div class="pt-prox-d"><b>${U.fmt(p.data_inicio)}</b><span>${U.pd(p.data_inicio).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}</span></div>
      <div class="pt-prox-t"><b>${U.esc(U.SERVICOS[p.servico] || "")}</b><span>${U.esc(nomes(p.pets))} · ${U.esc(U.periodo(p.data_inicio, p.data_fim))}</span>${pixBloco(p)}</div></article>`).join("")}</section>` : ""}

    <section id="fotos"><h2 class="pt-sec">Fotos</h2>
      ${fotos.length ? `<div class="pt-galeria">${fotos.slice(0, 60).map(r => `<button class="pt-foto" data-foto="${U.esc(r.foto)}"><img src="${U.esc(r.foto)}" alt="" loading="lazy"></button>`).join("")}</div>` : `<div class="pt-card pt-vazio">As fotos que a Lari tirar dos seus pets aparecem aqui.</div>`}
    </section>

    <section id="pets"><h2 class="pt-sec">Meus pets</h2>
      ${D.pets.length ? D.pets.map(p => `<article class="pt-card pt-pet" data-pet="${p.id}">
        <div class="pt-pet-h"><button class="pt-pet-foto" data-trocafoto="${p.id}" aria-label="Trocar a foto de ${U.esc(p.nome)}">${p.foto ? `<img src="${U.esc(p.foto)}" alt="">` : ic(p.especie === "gato" ? "gato" : "cao")}<span>${ic("camera")}</span></button>
        <div><h3 class="pt-h2">${U.esc(p.nome)}</h3><p class="pt-muted">${[p.especie === "gato" ? "Gato" : "Cão", p.raca, p.idade, p.porte ? U.PORTE_TXT[p.porte] : ""].filter(Boolean).map(U.esc).join(" · ")}</p></div></div>
        <details class="pt-ficha"><summary>${ic("nota")} Ver e atualizar a ficha</summary>
          <form data-ficha="${p.id}">${FICHA.map(([k, l, ph]) => `<label class="pt-f"><span>${l}</span><textarea name="${k}" rows="2" placeholder="${ph}" maxlength="1000">${U.esc(p[k] || "")}</textarea></label>`).join("")}
          <button class="btn primary pt-big" type="submit">${ic("salvar")} Salvar a ficha</button>
          ${p.atualizado_tutor_em ? `<p class="pt-mini">Você atualizou em ${U.fmtY(p.atualizado_tutor_em.slice(0, 10))}.</p>` : ""}</form></details></article>`).join("")
      : `<div class="pt-card pt-vazio">Seus pets ainda não estão cadastrados. Fale com a Lari.</div>`}
    </section>

    ${passadas.length ? `<section><h2 class="pt-sec">Serviços anteriores</h2><div class="pt-card">${passadas.slice(0, 12).map(p => `<div class="pt-hist">
      <div><b>${U.esc(U.SERVICOS[p.servico] || "")} · ${U.esc(nomes(p.pets))}</b><span class="pt-muted">${U.esc(U.periodo(p.data_inicio, p.data_fim))}</span></div>
      ${p.avaliacao ? `<span class="pt-estrelas on" aria-label="Você deu ${p.avaliacao.nota} de 5">${[1, 2, 3, 4, 5].map(n => `<i class="${n <= p.avaliacao.nota ? "s" : ""}">${ic("estrela")}</i>`).join("")}</span>`
        : `<button class="btn soft small" data-avaliar="${p.id}">${ic("estrela")} Avaliar</button>`}</div>`).join("")}</div></section>` : ""}

    <section class="pt-card pt-contato"><h2 class="pt-h2">Precisa de algo?</h2><p class="pt-p">Fale com a Lari pelo WhatsApp. Ela responde assim que puder.</p>
      <a class="btn primary pt-big" href="${zap("Oi, Lari! ")}" target="_blank" rel="noopener">${ic("conversa")} Falar com a Lari</a>
      ${D.contato?.instagram ? `<a class="pt-link" href="https://instagram.com/${U.esc(D.contato.instagram.replace(/^@/, ""))}" target="_blank" rel="noopener">${U.esc(D.contato.instagram)} no Instagram</a>` : ""}
      <button class="pt-link" id="ptSalvar">${ic("casa")} Como deixar esta página na tela do celular</button></section>
    <p class="pt-mini pt-rodape">Este link é só seu. Não encaminhe para outras pessoas.</p>`;
}

// ---------- ações ----------
async function confirmarProposta(id, op) {
  const p = D.propostas.find(x => x.id === id); if (!p) return;
  const o = op ? p.opcoes.find(x => x.n === op) : null; const valor = o ? o.valor_total : p.valor_total;
  const ok = await U.confirmDialog(`Confirmar ${o ? `a opção ${o.n} (${o.titulo || U.SERVICOS[o.servico] || ""})` : "o orçamento"} de ${U.brl(valor)}? Depois é só pagar o sinal de ${U.brl2(valor / 2)} pelo Pix.`, { ok: "Sim, quero confirmar" });
  if (!ok) return;
  try {
    D = await api("aceitar", { proposta_id: id, opcao: op || null }); pintar();
    const novo = D.propostas.find(x => x.id === id);
    if (novo && D.pix) verPix(novo); else U.toast("Confirmado! A Lari já foi avisada.", 4500);
  } catch (e) { U.toast(e.message, 4500); }
}

async function verPix(p) {
  const sinal = (p.pagamentos || []).find(g => /sinal/i.test(g.descricao)) || (p.pagamentos || [])[0]; if (!sinal || !D.pix) return;
  const { pixPayload, pixQR } = await import("./pix.js");
  const payload = pixPayload({ chave: D.pix.chave, nome: D.pix.nome, cidade: D.pix.cidade, valor: Number(sinal.valor), txid: (p.numero || "PETLAR").replace(/\W/g, "") });
  const qr = await pixQR(payload, 5).catch(() => null);
  const m = U.modal(`<h3>Pix do sinal · ${U.brl2(sinal.valor)}</h3>
    <ol class="pt-passos"><li>Toque em <b>Copiar código Pix</b>.</li><li>Abra o app do seu banco e escolha <b>Pix copia e cola</b>.</li><li>Cole o código e confirme.</li></ol>
    ${qr ? `<img class="pt-qr" src="${qr}" alt="QR Code do Pix">` : ""}
    <div class="acts"><button class="btn primary pt-big" data-copiar>${ic("copiar")} Copiar código Pix</button>
    <a class="btn soft pt-big" href="${zap(`Oi, Lari! Paguei o sinal (${U.brl2(sinal.valor)}) do orçamento ${p.numero || ""}. Segue o comprovante:`)}" target="_blank" rel="noopener">${ic("conversa")} Mandar o comprovante</a>
    <button class="btn soft" data-close>Fechar</button></div>`);
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
  const m = U.modal(`<h3>Como foi ${U.esc(U.SERVICOS[p.servico] || "o serviço")} de ${U.esc(nomes(p.pets))}?</h3>
    <div class="pt-estrelas pt-escolher">${[1, 2, 3, 4, 5].map(n => `<button data-n="${n}" aria-label="${n} de 5">${ic("estrela")}</button>`).join("")}</div>
    <label class="pt-f"><span>Quer contar algo? (opcional)</span><textarea rows="3" maxlength="1000" placeholder="Seu recado para a Lari"></textarea></label>
    <div class="acts"><button class="btn primary pt-big" data-env disabled>Enviar</button><button class="btn soft" data-close>Agora não</button></div>`);
  m.el.querySelector(".pt-escolher").addEventListener("click", e => { const b = e.target.closest("[data-n]"); if (!b) return; nota = Number(b.dataset.n);
    m.el.querySelectorAll(".pt-escolher button").forEach(x => x.classList.toggle("s", Number(x.dataset.n) <= nota)); m.el.querySelector("[data-env]").disabled = false; });
  m.el.querySelector("[data-env]").addEventListener("click", async e => {
    e.currentTarget.disabled = true; const comentario = m.el.querySelector("textarea").value;
    try { await api("avaliar", { proposta_id: id, nota, comentario }); p.avaliacao = { nota, comentario }; m.close(); pintar(); U.toast("Obrigada! A Lari vai adorar ler.", 4000); }
    catch (err) { e.currentTarget.disabled = false; U.toast(err.message); }
  });
}

function comoSalvar() {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  U.modal(`<h3>Deixar na tela do celular</h3>${ios
    ? `<ol class="pt-passos"><li>No Safari, toque no botão <b>Compartilhar</b> (o quadrado com a seta para cima).</li><li>Escolha <b>Adicionar à Tela de Início</b>.</li><li>Toque em <b>Adicionar</b>. Pronto: a Pet Lar vira um ícone no seu celular.</li></ol>`
    : `<ol class="pt-passos"><li>No Chrome, toque nos <b>três pontinhos</b> lá em cima.</li><li>Escolha <b>Adicionar à tela inicial</b>.</li><li>Toque em <b>Adicionar</b>. Pronto: a Pet Lar vira um ícone no seu celular.</li></ol>`}
    <p class="pt-mini">Se perder o link, é só pedir outro para a Lari.</p><div class="acts"><button class="btn soft" data-close>Entendi</button></div>`);
}

root.addEventListener("click", async e => {
  const ir = e.target.closest('a[href^="#"]'); if (ir) { e.preventDefault(); document.querySelector(ir.getAttribute("href"))?.scrollIntoView({ behavior: "smooth" }); return; } // não troca o # (é onde fica o código do link)
  const a = e.target.closest("[data-aceitar]"); if (a) return confirmarProposta(a.dataset.aceitar, a.dataset.op ? Number(a.dataset.op) : null);
  const v = e.target.closest("[data-verpix]"); if (v) return verPix(D.propostas.find(x => x.id === v.dataset.verpix));
  const f = e.target.closest("[data-foto]"); if (f) { U.modal(`<img class="pt-foto-g" src="${U.esc(f.dataset.foto)}" alt=""><div class="acts"><button class="btn soft" data-close>Fechar</button></div>`); return; }
  const av = e.target.closest("[data-avaliar]"); if (av) return avaliar(av.dataset.avaliar);
  if (e.target.closest("#ptSalvar")) return comoSalvar();
  const tf = e.target.closest("[data-trocafoto]"); if (tf) {
    const inp = Object.assign(document.createElement("input"), { type: "file", accept: "image/*" });
    inp.addEventListener("change", async () => { const file = inp.files[0]; if (!file) return;
      tf.classList.add("enviando");
      try { const imagem = await reduzir(file); const r = await api("foto", { pet_id: tf.dataset.trocafoto, imagem });
        const pet = D.pets.find(p => p.id === tf.dataset.trocafoto); pet.foto = r.foto; pintar(); U.toast("Foto nova salva!"); }
      catch (err) { tf.classList.remove("enviando"); U.toast(err.message || "Não consegui enviar a foto."); } });
    inp.click();
  }
});
root.addEventListener("submit", async e => {
  const f = e.target.closest("[data-ficha]"); if (!f) return; e.preventDefault();
  const b = f.querySelector("button[type=submit]"); b.disabled = true;
  const campos = Object.fromEntries(new FormData(f));
  try { await api("ficha", { pet_id: f.dataset.ficha, campos }); Object.assign(D.pets.find(p => p.id === f.dataset.ficha), campos, { atualizado_tutor_em: new Date().toISOString() });
    U.toast("Ficha salva. Obrigada! A Lari já vê as novidades."); }
  catch (err) { U.toast(err.message); } finally { b.disabled = false; }
});

async function carregar() {
  if (!TOKEN) return erro("Para entrar, use o link que a Lari mandou no seu WhatsApp.", false);
  root.innerHTML = `<div class="pt-load"><div class="sk" style="height:34px;width:60%;margin:8px auto 18px"></div><div class="sk" style="height:140px"></div></div>`;
  try { D = await api("dados"); pintar(); }
  catch (e) { if (e.status === 401) { try { localStorage.removeItem("petlar_tutor"); } catch {} return erro(e.message, false); } erro(e.message); }
}
carregar();
// abriu outro link com a página já aberta: recarrega com o código novo
window.addEventListener("hashchange", () => { const h = decodeURIComponent(location.hash.replace(/^#\/?/, "")).trim(); if (/^[A-Za-z0-9_-]{20,80}$/.test(h) && h !== TOKEN) location.reload(); });
