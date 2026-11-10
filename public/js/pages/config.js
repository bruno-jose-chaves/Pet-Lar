// Configurações: Pix, contato, capacidade, quem tem acesso e conta
import * as U from "../ui.js";
import * as db from "../db.js";
import { sair } from "../app.js";
import { pixPayload, pixQR } from "../pix.js";
import { perfil, gestao, admin, PAPEIS } from "../perfil.js";

export async function mount(root) {
  const [s, admins, user] = await Promise.all([db.getSettings(), admin() ? db.listAdmins().catch(() => []) : [], db.sb.auth.getUser().then(r => r.data.user)]);
  const G = gestao(), A = admin();
  const optPapel = sel => Object.entries(PAPEIS).map(([k, v]) => `<option value="${k}" ${k === sel ? "selected" : ""}>${v.nome}</option>`).join("");
  const f = (k, label, type = "text", ph = "", hint = "") => `<label class="f">${label}${hint ? ` <span class="hint">${hint}</span>` : ""}<input type="${type}" name="${k}" value="${U.esc(s[k] ?? "")}" placeholder="${ph}"></label>`;
  root.innerHTML = `<h1 class="pg">Configurações</h1>
    <div class="grid2">
      ${G ? `<form class="panel" id="fS">
        <h3>Pix das propostas</h3>
        ${f("pix_chave", "Chave Pix", "text", "CPF, e-mail, celular ou chave aleatória", "Com a chave preenchida, o PDF ganha o QR Code do sinal e a mensagem leva o Pix copia e cola.")}
        <div class="row">${f("pix_nome", "Nome do recebedor")}${f("pix_cidade", "Cidade")}</div>
        <div id="pixTeste"></div>
        <h3 style="margin-top:16px">Contato no PDF</h3>
        <div class="row">${f("whatsapp", "WhatsApp", "tel")}${f("instagram", "Instagram")}</div>
        <h3 style="margin-top:16px">Operação</h3>
        <div class="row">${f("capacidade_hospedagem", "Máx. de hóspedes por dia", "number")}${f("follow_up_dias", "Lembrar proposta sem resposta após (dias)", "number")}</div>
        <button class="btn primary" type="submit">Salvar</button>
      </form>` : `<div class="panel"><h3>Seu acesso: ${U.esc(PAPEIS[perfil.papel]?.nome || "")}</h3><p class="muted" style="margin:0">${U.esc(PAPEIS[perfil.papel]?.desc || "")}</p><p class="muted">Contato da Pet Lar: ${U.esc(s.whatsapp || "")} · ${U.esc(s.instagram || "")}</p></div>`}
      <div>
        ${A ? `<div class="panel"><h3>Quem tem acesso</h3>
          <div class="list" id="adm">${admins.map(a => `<div class="item" style="background:#fff;flex-wrap:wrap"><div class="main"><div class="t">${U.esc(a.nome || a.email)}${a.email === user?.email ? ' <span class="muted">(você)</span>' : ""}</div><div class="s">${U.esc(a.email)}</div></div>
            <select data-papel="${U.esc(a.email)}" aria-label="Nível de acesso" style="min-height:36px;border-radius:10px;border:1px solid var(--line);padding:4px 8px">${optPapel(a.papel || "gestora")}</select>
            ${a.email !== user?.email ? `<button class="x" data-rm="${U.esc(a.email)}">remover</button>` : ""}</div>`).join("")}</div>
          <form id="fA" style="margin-top:12px"><div class="row"><label class="f">Nome<input type="text" name="nome" placeholder="Larissa"></label><label class="f">E-mail<input type="text" name="email" inputmode="email" placeholder="email@exemplo.com"></label></div>
          <label class="f">Nível<select name="papel">${optPapel("gestora")}</select></label>
          <button class="btn soft" type="submit">Dar acesso</button>
          <p class="muted">Depois, a pessoa abre o site, digita o e-mail, cria uma senha e toca em “Primeiro acesso”.</p></form>
          <div class="niveis">${Object.values(PAPEIS).map(v => `<p><b>${v.nome}:</b> ${v.desc}</p>`).join("")}</div>
        </div>` : G ? `<div class="panel"><h3>Seu acesso: ${U.esc(PAPEIS[perfil.papel]?.nome || "")}</h3><p class="muted" style="margin:0">${U.esc(PAPEIS[perfil.papel]?.desc || "")} Para dar acesso a alguém, fale com o administrador.</p></div>` : ""}
        <div class="panel" style="margin-top:12px"><h3>Minha conta</h3><p class="muted" style="margin-top:0">${U.esc(user?.email || "")}</p>
          <form id="fP"><label class="f">Nova senha<input type="password" name="s" minlength="6" autocomplete="new-password"></label><div class="row-actions"><button class="btn soft" type="submit">Trocar senha</button><button class="btn danger" type="button" id="bSair">Sair</button></div></form>
        </div>
        <div class="panel" style="margin-top:12px"><h3>Sobre</h3><p class="muted" style="margin:0">Pet Lar · painel v1.1 · tabela de preços v2.3 · <a href="#/ajuda">Como usar</a><br>Dados no Supabase (São Paulo) · site na Cloudflare</p></div>
      </div>
    </div>`;
  async function testePix() {
    const box = U.$("#pixTeste", root); const ch = U.$("[name=pix_chave]", root).value.trim();
    if (!ch) { box.innerHTML = ""; return; }
    const payload = pixPayload({ chave: ch, nome: U.$("[name=pix_nome]", root).value, cidade: U.$("[name=pix_cidade]", root).value, valor: 1, txid: "TESTE" });
    const url = await pixQR(payload, 4);
    box.innerHTML = `<div class="item" style="background:#fff;margin-bottom:10px"><img src="${url}" alt="QR de teste" style="width:84px;height:84px"><div class="main"><div class="t">Teste: Pix de R$ 1,00</div><div class="s" style="white-space:normal">Pague pelo app do banco para conferir se cai na conta certa.</div></div></div>`;
  }
  if (G) {
  testePix();
  U.$("[name=pix_chave]", root).addEventListener("input", U.debounce(testePix, 500));
  U.$("#fS", root).addEventListener("submit", async e => {
    e.preventDefault(); const v = Object.fromEntries(new FormData(e.target));
    v.capacidade_hospedagem = Number(v.capacidade_hospedagem) || 3; v.follow_up_dias = Number(v.follow_up_dias) || 2;
    for (const k of ["pix_chave", "pix_nome", "pix_cidade", "whatsapp", "instagram"]) v[k] = String(v[k]).trim() || null;
    try { await db.saveSettings(v); U.toast("Configurações salvas ✓"); } catch (err) { U.toast("Não consegui salvar: " + err.message); }
  });
  }
  if (A) {
  U.$("#fA", root).addEventListener("submit", async e => {
    e.preventDefault(); const v = Object.fromEntries(new FormData(e.target));
    if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) { U.toast("E-mail inválido."); return; }
    try { await db.addAdmin(v.email, v.nome.trim() || null, v.papel); U.toast("Acesso liberado ✓"); mount(root); } catch (err) { U.toast(err.message.includes("duplicate") ? "Esse e-mail já tem acesso." : err.message); }
  });
  U.$("#adm", root).addEventListener("click", async e => {
    const b = e.target.closest("[data-rm]"); if (!b) return;
    if (!(await U.confirmDialog("Remover o acesso de " + b.dataset.rm + "?", { ok: "Remover", danger: true }))) return;
    try { await db.removeAdmin(b.dataset.rm); U.toast("Acesso removido"); } catch (err) { U.toast(err.message); } mount(root);
  });
  U.$("#adm", root).addEventListener("change", async e => {
    const sel = e.target.closest("[data-papel]"); if (!sel) return;
    try { await db.setPapel(sel.dataset.papel, sel.value); U.toast("Nível alterado para " + PAPEIS[sel.value].nome + " ✓"); if (sel.dataset.papel === user?.email) setTimeout(() => location.reload(), 900); }
    catch (err) { U.toast(err.message.includes("administrador") ? "Precisa existir pelo menos um administrador." : err.message); mount(root); }
  });
  }
  U.$("#fP", root).addEventListener("submit", async e => {
    e.preventDefault(); const p = e.target.s.value; if (p.length < 6) { U.toast("Mínimo 6 caracteres."); return; }
    const { error } = await db.sb.auth.updateUser({ password: p }); U.toast(error ? error.message : "Senha alterada ✓"); e.target.reset();
  });
  U.$("#bSair", root).onclick = sair;
}
