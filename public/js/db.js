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
export async function listAdmins() { return chk(await sb.from("admins").select("email,nome,created_at").order("created_at")); }
export async function addAdmin(email, nome) { return chk(await sb.from("admins").insert({ email: email.trim().toLowerCase(), nome })); }
export async function removeAdmin(email) { return chk(await sb.from("admins").delete().eq("email", email)); }

// ---------- painel ----------
export async function resumo(hoje) { return chk(await sb.rpc("painel_resumo", { p_hoje: hoje })); }

const PROP_COLS = "id,numero,status,servico,tutor_id,tutor_nome,data_inicio,data_fim,cidade,valor_total,valor_cheio,resumo,enviada_em,created_at,updated_at";
const PROP_PETS = "proposta_pets(pets(id,nome,especie,porte,foto_path))";

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

export async function listPropostas({ status, q, page = 0, size = 20 } = {}) {
  let r = sb.from("propostas").select("id,numero,status,servico,tutor_nome,data_inicio,data_fim,valor_total,resumo,created_at,enviada_em", { count: "exact" })
    .order("created_at", { ascending: false }).range(page * size, page * size + size - 1);
  if (status) r = r.eq("status", status);
  if (q) { const t = q.replace(/[%,()]/g, " ").trim(); r = r.or(`tutor_nome.ilike.%${t}%,numero.ilike.%${t}%`); }
  return chk(await r);
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
export async function listTutores({ q, page = 0, size = 30 } = {}) {
  let r = sb.from("tutores").select("id,nome,whatsapp,cidade,bairro,pets(id,nome,especie,foto_path)", { count: "exact" }).order("nome").range(page * size, page * size + size - 1);
  if (q) r = r.ilike("nome", `%${q.replace(/[%,()]/g, " ").trim()}%`);
  return chk(await r);
}
export async function getTutor(id) { return chk(await sb.from("tutores").select("*").eq("id", id).single()); }
export async function tutorDetalhe(id) {
  const [tutor, pets, props] = await Promise.all([
    getTutor(id),
    sb.from("pets").select("id,nome,especie,raca,porte,foto_path,ativo").eq("tutor_id", id).order("nome").then(chk),
    sb.from("propostas").select("id,numero,status,servico,data_inicio,data_fim,valor_total,created_at").eq("tutor_id", id).order("created_at", { ascending: false }).then(chk),
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
const PET_COLS = "id,tutor_id,nome,especie,raca,idade,porte,passeia,foto_path,alimentacao,medicacao,comportamento,limitacoes,veterinario,reativo,observacoes,ativo";
export async function petsDoTutor(tutorId) { return chk(await sb.from("pets").select(PET_COLS).eq("tutor_id", tutorId).order("nome")); }
export async function getPets(ids) { if (!ids.length) return []; return chk(await sb.from("pets").select(PET_COLS).in("id", ids)); }
export async function listPets({ q, page = 0, size = 30 } = {}) {
  let r = sb.from("pets").select("id,nome,especie,raca,porte,foto_path,ativo,tutor_id,tutores(nome)", { count: "exact" }).order("nome").range(page * size, page * size + size - 1);
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
  return chk(await sb.from("propostas").select("servico,valor_total").eq("status", "aceita").gte("data_inicio", ini).lte("data_inicio", fim));
}
