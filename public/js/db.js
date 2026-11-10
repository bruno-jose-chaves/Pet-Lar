// Conexão com o Supabase + funções de dados (todas as consultas do app passam por aqui)
const URL_SB = "https://jyzqcazwargpywjmayoh.supabase.co";
const KEY_SB = "sb_publishable_5VCBmavQviKh0GrvUWmp_A_3Z_HeARk"; // chave pública (segurança fica no RLS do banco)

// tempo-limite em toda chamada ao banco (evita tela travada em rede ruim)
const fetchTimeout = (input, init = {}) => {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 20000);
  if (init.signal) init.signal.addEventListener("abort", () => ctrl.abort());
  return fetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(t));
};

export const sb = window.supabase.createClient(URL_SB, KEY_SB, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "petlar-auth" },
  global: { fetch: fetchTimeout },
});

function chk({ data, error, count }) { if (error) throw error; return count !== undefined && count !== null ? { data, count } : data; }

// ---------- cache curto em memória (evita chamadas repetidas) ----------
const cache = new Map();
export function cached(key, ms, fn) {
  const hit = cache.get(key); if (hit && Date.now() - hit.t < ms) return hit.p;
  const p = fn().catch(e => { cache.delete(key); throw e; }); cache.set(key, { t: Date.now(), p }); return p;
}
export function invalidate(prefix) { for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k); }

// ---------- configurações ----------
export const getSettings = () => cached("settings", 60000, async () => chk(await sb.from("settings").select("*").eq("id", 1).single()));
export async function saveSettings(v) { invalidate("settings"); return chk(await sb.from("settings").update(v).eq("id", 1).select().single()); }
export async function listAdmins() { return chk(await sb.from("admins").select("email,nome,papel,created_at").order("created_at")); }
export async function addAdmin(email, nome, papel = "gestora") { return chk(await sb.from("admins").insert({ email: email.trim().toLowerCase(), nome, papel })); }
export async function setPapel(email, papel) { return chk(await sb.from("admins").update({ papel }).eq("email", email)); }
export async function removeAdmin(email) { return chk(await sb.from("admins").delete().eq("email", email)); }

// ---------- painel ----------
export async function resumo(hoje) { return chk(await sb.rpc("painel_resumo", { p_hoje: hoje })); }

const PROP_COLS = "id,numero,status,servico,tutor_id,tutor_nome,data_inicio,data_fim,cidade,valor_total,valor_cheio,resumo,enviada_em,created_at,updated_at";
const PROP_PETS = "proposta_pets(pets(id,nome,especie,raca,porte,foto_path,ativo,medicacao,limitacoes,reativo))";

export async function propostasAtivas(dia) {
  return chk(await sb.from("propostas").select(`${PROP_COLS},${PROP_PETS}`).eq("status", "aceita").lte("data_inicio", dia).gte("data_fim", dia).order("data_inicio"));
}
export async function propostasPeriodo(ini, fim) {
  return chk(await sb.from("propostas").select(`${PROP_COLS},${PROP_PETS}`).eq("status", "aceita").lte("data_inicio", fim).gte("data_fim", ini).order("data_inicio"));
}
export async function propostasProximas(dia, dias = 7) {
  const lim = new Date(dia); lim.setDate(lim.getDate() + dias);
  return chk(await sb.from("propostas").select(`${PROP_COLS},${PROP_PETS}`).eq("status", "aceita").gt("data_inicio", dia).lte("data_inicio", lim.toISOString().slice(0, 10)).order("data_inicio"));
}
export async function followUps(dias) {
  const lim = new Date(Date.now() - dias * 86400000).toISOString();
  return chk(await sb.from("propostas").select("id,numero,tutor_nome,tutor_id,servico,valor_total,enviada_em,tutores(whatsapp)").eq("status", "enviada").lt("enviada_em", lim).order("enviada_em").limit(10));
}

// colunas das listas com ações rápidas (Propostas, Cobrar, Hoje)
export const PROP_LISTA = "id,numero,status,servico,tutor_id,tutor_nome,data_inicio,data_fim,valor_total,valor_cheio,resumo,created_at,enviada_em,cobrancas,cobrada_em,lembrar_em,opcoes:payload->opcoes,escolhida:payload->escolhida,tutores(whatsapp),proposta_pets(pets(nome))";
// filtros da tela Propostas (f = { criado:{ini,fim}, servicoData:{ini,fim}, servicos:[], cidades:[], valor:{min,max} })
function filtrarPropostas(r, f = {}) {
  if (f.criado?.ini) r = r.gte("created_at", f.criado.ini);
  if (f.criado?.fim) r = r.lte("created_at", f.criado.fim + "T23:59:59.999");
  if (f.servicoData?.fim) r = r.lte("data_inicio", f.servicoData.fim);
  if (f.servicoData?.ini) r = r.gte("data_fim", f.servicoData.ini);
  if (f.servicos?.length) r = r.in("servico", f.servicos);
  if (f.cidades?.length) r = r.in("cidade", f.cidades);
  if (f.valor?.min) r = r.gte("valor_total", Number(f.valor.min));
  if (f.valor?.max) r = r.lte("valor_total", Number(f.valor.max));
  return r;
}
export async function listPropostas({ status, q, page = 0, size = 20, f } = {}) {
  let r = sb.from("propostas").select(PROP_LISTA, { count: "exact" })
    .order("created_at", { ascending: false }).range(page * size, page * size + size - 1);
  if (status) r = r.eq("status", status);
  if (q) { const t = q.replace(/[%,()]/g, " ").trim(); r = r.or(`tutor_nome.ilike.%${t}%,numero.ilike.%${t}%`); }
  return chk(await filtrarPropostas(r, f));
}
export async function contarStatus(status, f) {
  const r = await filtrarPropostas(sb.from("propostas").select("id", { count: "exact", head: true }).eq("status", status), f);
  return r.count || 0;
}
export async function getProposta(id) { return chk(await sb.from("propostas").select("*,proposta_pets(pet_id)").eq("id", id).single()); }
export async function insertProposta(row) { return chk(await sb.from("propostas").insert(row).select("id,numero,status").single()); }
export async function updateProposta(id, row) { return chk(await sb.from("propostas").update(row).eq("id", id).select("id,numero,status").single()); }
export async function deleteProposta(id) { return chk(await sb.from("propostas").delete().eq("id", id)); }
export async function setPropostaPets(id, petIds) {
  chk(await sb.from("proposta_pets").delete().eq("proposta_id", id));
  if (petIds.length) chk(await sb.from("proposta_pets").insert(petIds.map(pet_id => ({ proposta_id: id, pet_id }))));
}

// ---------- tutores ----------
export async function searchTutores(q, limit = 6) {
  const t = q.replace(/[%,()]/g, " ").trim();
  return chk(await sb.from("tutores").select("id,nome,whatsapp,cidade").ilike("nome", `%${t}%`).order("nome").limit(limit));
}
export async function listTutores({ q, page = 0, size = 30, comPropostas = false } = {}) {
  let r = sb.from("tutores").select(`id,nome,whatsapp,cidade,bairro,pets(id,nome,especie,foto_path)${comPropostas ? ",propostas(status,created_at)" : ""}`, { count: "exact" }).order("nome").range(page * size, page * size + size - 1);
  if (q) r = r.ilike("nome", `%${q.replace(/[%,()]/g, " ").trim()}%`);
  return chk(await r);
}
export async function getTutor(id) { return chk(await sb.from("tutores").select("*").eq("id", id).single()); }
export async function tutorDetalhe(id) {
  const [tutor, pets, props] = await Promise.all([
    getTutor(id),
    sb.from("pets").select("id,nome,especie,raca,porte,foto_path,ativo").eq("tutor_id", id).order("nome").then(chk),
    sb.from("propostas").select("id,numero,status,servico,data_inicio,data_fim,valor_total,valor_cheio,resumo,created_at,enviada_em,respondida_em,proposta_pets(pets(id,nome))").eq("tutor_id", id).order("created_at", { ascending: false }).then(chk),
  ]);
  return { tutor, pets, props };
}
export async function saveTutor(t) {
  const { id, ...v } = t;
  if (id) return chk(await sb.from("tutores").update(v).eq("id", id).select().single());
  return chk(await sb.from("tutores").insert(v).select().single());
}
export async function deleteTutor(id) { return chk(await sb.from("tutores").delete().eq("id", id)); }

// ---------- pets ----------
const PET_COLS = "id,tutor_id,nome,especie,raca,idade,porte,passeia,foto_path,alimentacao,medicacao,comportamento,limitacoes,veterinario,reativo,observacoes,ativo,atualizado_tutor_em";
export async function petsDoTutor(tutorId) { return chk(await sb.from("pets").select(PET_COLS).eq("tutor_id", tutorId).order("nome")); }
export async function getPets(ids) { if (!ids.length) return []; return chk(await sb.from("pets").select(PET_COLS).in("id", ids)); }
export async function listPets({ q, page = 0, size = 30 } = {}) {
  let r = sb.from("pets").select("id,nome,especie,raca,porte,foto_path,ativo,tutor_id,medicacao,limitacoes,reativo,tutores(nome)", { count: "exact" }).order("nome").range(page * size, page * size + size - 1);
  if (q) r = r.ilike("nome", `%${q.replace(/[%,()]/g, " ").trim()}%`);
  return chk(await r);
}
export async function petDetalhe(id) {
  const [pet, links] = await Promise.all([
    sb.from("pets").select(`${PET_COLS},tutores(id,nome,whatsapp)`).eq("id", id).single().then(chk),
    sb.from("proposta_pets").select("propostas(id,numero,status,servico,data_inicio,data_fim,valor_total)").eq("pet_id", id).then(chk),
  ]);
  return { pet, props: links.map(l => l.propostas).filter(Boolean).sort((a, b) => String(b.data_inicio).localeCompare(String(a.data_inicio))) };
}
export async function savePet(p) {
  const { id, ...v } = p;
  if (id) return chk(await sb.from("pets").update(v).eq("id", id).select(PET_COLS).single());
  return chk(await sb.from("pets").insert(v).select(PET_COLS).single());
}
export async function deletePet(id) { return chk(await sb.from("pets").delete().eq("id", id)); }

// ---------- fotos (armazenamento privado) ----------
export async function uploadFoto(petId, blob) {
  const path = `${petId}/${Date.now()}.jpg`;
  chk(await sb.storage.from("pets").upload(path, blob, { contentType: "image/jpeg", upsert: true, cacheControl: "604800" }));
  return path;
}
export async function removeFoto(path) { if (path) await sb.storage.from("pets").remove([path]); }
const urlCache = new Map();
export async function fotoUrls(paths) {
  const need = [...new Set(paths.filter(p => p && !urlCache.has(p)))];
  if (need.length) {
    const r = chk(await sb.storage.from("pets").createSignedUrls(need, 3600));
    r.forEach(x => x.signedUrl && urlCache.set(x.path, x.signedUrl));
  }
  return Object.fromEntries(paths.filter(Boolean).map(p => [p, urlCache.get(p)]));
}
export async function fotoDataURL(path) {
  const { data, error } = await sb.storage.from("pets").download(path); if (error) throw error;
  return new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(data); });
}

// ---------- pagamentos ----------
export async function pagamentosAbertos() {
  return chk(await sb.from("pagamentos").select("id,descricao,valor,vencimento,pago_em,forma,proposta_id,propostas(numero,tutor_nome,servico,tutor_id,tutores(whatsapp))").is("pago_em", null).order("vencimento"));
}
export async function pagamentosMes(ini, fim) {
  return chk(await sb.from("pagamentos").select("id,descricao,valor,vencimento,pago_em,forma,proposta_id,propostas(numero,tutor_nome,servico)").gte("pago_em", ini).lte("pago_em", fim).order("pago_em", { ascending: false }));
}
export async function pagamentosDaProposta(id) { return chk(await sb.from("pagamentos").select("*").eq("proposta_id", id).order("vencimento")); }
export async function marcarPago(id, forma = "pix", data = null) { return chk(await sb.from("pagamentos").update({ pago_em: data || new Date().toISOString().slice(0, 10), forma }).eq("id", id)); }
export async function desmarcarPago(id) { return chk(await sb.from("pagamentos").update({ pago_em: null, forma: null }).eq("id", id)); }
export async function receitaPorServico(ini, fim) {
  return chk(await sb.from("propostas").select("servico,valor_total,tutor_nome").eq("status", "aceita").gte("data_inicio", ini).lte("data_inicio", fim));
}

// histórico agrupado por cliente (tela Propostas → "Por cliente")
export async function propostasPorCliente() {
  const rows = chk(await sb.from("propostas").select("tutor_id,tutor_nome,status,valor_total,created_at").order("created_at", { ascending: false }).limit(2000));
  const m = new Map();
  for (const p of rows) {
    const k = p.tutor_id || "nome:" + (p.tutor_nome || "Sem tutor");
    const g = m.get(k) || { tutor_id: p.tutor_id, nome: p.tutor_nome || "Sem tutor", total: 0, aceitas: 0, recusadas: 0, valorAceito: 0, ultima: p.created_at };
    g.total++; if (p.status === "aceita") { g.aceitas++; g.valorAceito += Number(p.valor_total || 0); } if (p.status === "recusada") g.recusadas++;
    m.set(k, g);
  }
  return [...m.values()];
}
// serviço confirmado (visão da assistente: sem valores)
export async function getServico(id) {
  return chk(await sb.from("propostas").select("id,numero,servico,status,data_inicio,data_fim,cidade,tutor_id,tutor_nome,resumo,obs:payload->>obs,tutores(id,nome,whatsapp,endereco,bairro,cidade,observacoes),proposta_pets(pets(id,nome,especie,raca,porte,foto_path,alimentacao,medicacao,comportamento,limitacoes,reativo))").eq("id", id).single());
}

// ---------- ações rápidas e cobranças ----------
export async function propostasEnviadas() {
  return chk(await sb.from("propostas").select(PROP_LISTA).eq("status", "enviada").order("enviada_em", { ascending: true }).limit(500));
}
export async function getPayload(id) { return chk(await sb.from("propostas").select("payload").eq("id", id).single()).payload || {}; }
export async function atualizarProposta(id, row) { return chk(await sb.from("propostas").update(row).eq("id", id).select("id,status").single()); }
export async function statusEmLote(ids, status) { return chk(await sb.from("propostas").update({ status }).in("id", ids).select("id")); }
export async function registrarCobranca(id, n, lembrarEm) {
  return chk(await sb.from("propostas").update({ cobrancas: n, cobrada_em: new Date().toISOString(), lembrar_em: lembrarEm }).eq("id", id).select("id").single());
}
export async function apagarPagamentosAbertos(propostaId) { return chk(await sb.from("pagamentos").delete().eq("proposta_id", propostaId).is("pago_em", null)); }
export async function linkNovaSenha(email) {
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin });
  if (error) throw error; return true;
}

// ---------- diário do pet ----------
const DIA_COLS = "id,pet_id,proposta_id,tipo,nota,foto_path,criado_em,autor";
const limitesDia = dia => { const a = new Date(dia + "T00:00:00"), b = new Date(dia + "T23:59:59.999"); return [a.toISOString(), b.toISOString()]; };
export async function diarioDoServico(propostaId, dia) {
  const [a, b] = limitesDia(dia);
  return chk(await sb.from("diario").select(DIA_COLS).eq("proposta_id", propostaId).gte("criado_em", a).lte("criado_em", b).order("criado_em"));
}
export async function diarioDoPet(petId, limit = 60) {
  return chk(await sb.from("diario").select(DIA_COLS).eq("pet_id", petId).order("criado_em", { ascending: false }).limit(limit));
}
export async function addDiario(rows) { return chk(await sb.from("diario").insert(rows).select(DIA_COLS)); }
export async function updateDiario(id, row) { return chk(await sb.from("diario").update(row).eq("id", id).select(DIA_COLS).single()); }
export async function deleteDiario(ids) { return chk(await sb.from("diario").delete().in("id", ids)); }
export async function uploadFotoDiario(petId, blob) {
  const path = `diario/${petId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
  const { error } = await sb.storage.from("pets").upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error; return path;
}
export async function getServicoBasico(id) {
  return chk(await sb.from("propostas").select("id,numero,servico,status,data_inicio,data_fim,tutor_id,tutor_nome,tutores(whatsapp),proposta_pets(pets(id,nome,especie,foto_path))").eq("id", id).single());
}
export async function fotoBlob(path) { const { data, error } = await sb.storage.from("pets").download(path); if (error) throw error; return data; }

// ---------- área do tutor (link pessoal) ----------
const ACESSO_COLS = "id,tutor_id,token,criado_em,expira_em,revogado_em,aceite_em,ultimo_acesso,acessos";
export function linkPortal(token) { return `${location.origin}/t/#${token}`; }
function novoToken() { const b = crypto.getRandomValues(new Uint8Array(24)); return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
export async function acessoTutor(tutorId) {
  const r = chk(await sb.from("tutor_acessos").select(ACESSO_COLS).eq("tutor_id", tutorId).is("revogado_em", null).order("criado_em", { ascending: false }).limit(1));
  return r[0] || null;
}
export async function criarAcessoTutor(tutorId) {
  return chk(await sb.from("tutor_acessos").insert({ tutor_id: tutorId, token: novoToken() }).select(ACESSO_COLS).single());
}
export async function revogarAcessoTutor(id) { return chk(await sb.from("tutor_acessos").update({ revogado_em: new Date().toISOString() }).eq("id", id)); }
export async function avaliacoesDoTutor(tutorId) { return chk(await sb.from("avaliacoes").select("proposta_id,nota,comentario,criado_em").eq("tutor_id", tutorId)); }
