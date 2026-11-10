// Serviço confirmado, visão da assistente: quem, quando, onde e os cuidados. Sem valores.
import * as U from "../ui.js";
import * as db from "../db.js";

export async function mount(root, { params }) {
  let p;
  try { p = await db.getServico(params[0]); }
  catch { root.innerHTML = `<a class="backlink" href="#/agenda">‹ Agenda</a><div class="empty">Este serviço não está disponível para o seu acesso.</div>`; return; }
  const pets = (p.proposta_pets || []).map(x => x.pets).filter(Boolean);
  const fotos = await db.fotoUrls(pets.map(x => x.foto_path)).catch(() => ({}));
  const t = p.tutores || {};
  const end = [t.endereco, t.bairro, t.cidade].filter(Boolean).join(", ");
  const linha = (k, v) => v ? `<div><span>${k}</span><b>${U.esc(v)}</b></div>` : "";
  root.innerHTML = `<a class="backlink" href="#/agenda">‹ Agenda</a>
    <h1 class="pg">${U.esc(pets.map(x => x.nome).filter(Boolean).join(" e ") || p.tutor_nome || "Serviço")}</h1>
    <p class="muted" style="margin-top:-6px">${U.svcPill(p.servico)} ${U.esc(U.periodo(p.data_inicio, p.data_fim) || "sem data")} · ${U.esc(p.numero || "")}</p>
    <div class="grid2">
      <div>
        <h2 class="sec" style="margin-top:0">Pets</h2>
        <div class="list">${pets.map(x => `<a class="item" href="#/pet/${x.id}"><div class="av">${x.foto_path && fotos[x.foto_path] ? `<img src="${fotos[x.foto_path]}" alt="" loading="lazy">` : U.PAW}</div>
          <div class="main"><div class="t">${U.esc(x.nome || "Sem nome")}${x.reativo ? ' <span class="pill recusada">reativo</span>' : ""}</div>
          <div class="s" style="white-space:normal">${U.esc([x.especie === "gato" ? "Gato" : "Cão " + (U.PORTE_TXT[x.porte] || "").toLowerCase(), x.raca].filter(Boolean).join(" · "))}
          ${x.alimentacao ? "<br>🥣 " + U.esc(x.alimentacao) : ""}${x.medicacao ? "<br>💊 " + U.esc(x.medicacao) : ""}${x.limitacoes ? "<br>⚠️ " + U.esc(x.limitacoes) : ""}${x.comportamento ? "<br>🐾 " + U.esc(x.comportamento) : ""}</div></div></a>`).join("") || `<div class="empty">Sem pets ligados.</div>`}</div>
      </div>
      <div class="panel">
        <h3>Tutor</h3>
        <div class="ficha-l">${linha("Nome", t.nome || p.tutor_nome)}${linha("WhatsApp", t.whatsapp)}${linha("Endereço", end)}${linha("Acesso / observações", t.observacoes)}</div>
        <div class="row-actions">${t.whatsapp ? `<a class="btn wa small" href="${U.waLink(t.whatsapp, "")}" target="_blank" rel="noopener">WhatsApp</a>` : ""}${end ? `<a class="btn soft small" href="https://maps.google.com/?q=${encodeURIComponent(end)}" target="_blank" rel="noopener">Mapa</a>` : ""}${t.id ? `<a class="btn soft small" href="#/tutor/${t.id}">Ficha</a>` : ""}</div>
        ${p.obs ? `<h3 style="margin-top:14px">Recado da proposta</h3><p style="white-space:pre-wrap;margin:0">${U.esc(p.obs)}</p>` : ""}
      </div>
    </div>`;
}
