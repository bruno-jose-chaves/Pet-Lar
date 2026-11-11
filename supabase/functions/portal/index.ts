// Pet Lar · Edge Function "portal" — a área do tutor.
// O tutor entra por um link pessoal (token) que a Larissa manda no WhatsApp. Sem senha, sem SMS.
// Esta função valida o link e é a ÚNICA porta do portal para o banco: usa a chave de serviço,
// mas só devolve/altera o que é daquele tutor. O token nunca dá acesso ao painel.
import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });
class Erro extends Error { constructor(msg: string, public status = 400) { super(msg); } }

const hojeBR = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
const texto = (v: unknown, max = 1000) => (v == null ? null : String(v).trim().slice(0, max) || null);
const FICHA = ["alimentacao", "medicacao", "comportamento", "limitacoes", "veterinario", "observacoes", "raca", "idade"] as const;
const TUTOR = ["whatsapp", "email", "endereco", "bairro", "cidade"] as const;
const PORTES = ["P", "M", "G", "GG"];

async function chk<T>(p: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await p; if (error) { console.error(error); throw new Erro("Erro no banco", 500); } return data;
}

async function acessoDoToken(token: unknown) {
  if (typeof token !== "string" || token.length < 20 || token.length > 80 || !/^[A-Za-z0-9_-]+$/.test(token)) throw new Erro("Link inválido", 401);
  const a = await chk(sb.from("tutor_acessos").select("id,tutor_id,expira_em,revogado_em,aceite_em,acessos").eq("token", token).maybeSingle());
  if (!a || a.revogado_em || (a.expira_em && new Date(a.expira_em) < new Date())) throw new Erro("Este link não vale mais. Peça um novo para a Lari.", 401);
  return a as { id: string; tutor_id: string; aceite_em: string | null; acessos: number };
}

async function urls(paths: (string | null | undefined)[]) {
  const ps = [...new Set(paths.filter(Boolean) as string[])]; if (!ps.length) return {} as Record<string, string>;
  const { data } = await sb.storage.from("pets").createSignedUrls(ps, 3600);
  return Object.fromEntries((data || []).filter(x => x.signedUrl).map(x => [x.path, x.signedUrl])) as Record<string, string>;
}

async function petsDoTutor(tutorId: string) {
  return await chk(sb.from("pets").select("id,nome,especie,raca,idade,porte,foto_path,alimentacao,medicacao,comportamento,limitacoes,veterinario,observacoes,atualizado_tutor_em")
    .eq("tutor_id", tutorId).neq("ativo", false).order("nome")) as Record<string, any>[];
}

async function propostaDoTutor(id: unknown, tutorId: string) {
  if (typeof id !== "string") throw new Erro("Proposta inválida");
  const p = await chk(sb.from("propostas").select("id,status,tutor_id,valor_total,valor_cheio,payload,data_inicio,data_fim").eq("id", id).maybeSingle()) as any;
  if (!p || p.tutor_id !== tutorId) throw new Erro("Proposta não encontrada", 404);
  return p;
}

async function dados(a: { id: string; tutor_id: string; aceite_em: string | null; acessos: number }) {
  const tutor = await chk(sb.from("tutores").select("id,nome,whatsapp,email,endereco,bairro,cidade").eq("id", a.tutor_id).single()) as any;
  const cfg = await chk(sb.from("settings").select("whatsapp,instagram,pix_chave,pix_nome,pix_cidade").eq("id", 1).maybeSingle()) as any;
  if (!a.aceite_em) return { precisa_aceite: true, tutor: { nome: tutor.nome }, contato: { whatsapp: cfg?.whatsapp, instagram: cfg?.instagram } };

  const pets = await petsDoTutor(a.tutor_id);
  const petIds = pets.map(p => p.id);
  const props = await chk(sb.from("propostas")
    .select("id,numero,status,servico,data_inicio,data_fim,valor_total,valor_cheio,resumo,validade_ate,enviada_em,opcoes:payload->opcoes,escolhida:payload->escolhida,recomendada:payload->recomendada,obs:payload->>obs,proposta_pets(pet_id)")
    .eq("tutor_id", a.tutor_id).in("status", ["enviada", "aceita"]).order("data_inicio", { ascending: false, nullsFirst: true }).limit(60)) as any[];
  const aceitas = props.filter(p => p.status === "aceita").map(p => p.id);
  const [pagtos, avals, diario] = await Promise.all([
    aceitas.length ? chk(sb.from("pagamentos").select("proposta_id,descricao,valor,vencimento,pago_em").in("proposta_id", aceitas).order("vencimento")) : [],
    aceitas.length ? chk(sb.from("avaliacoes").select("proposta_id,nota,comentario").in("proposta_id", aceitas)) : [],
    petIds.length ? chk(sb.from("diario").select("id,pet_id,proposta_id,tipo,nota,foto_path,criado_em").in("pet_id", petIds)
      .gte("criado_em", new Date(Date.now() - 60 * 864e5).toISOString()).order("criado_em", { ascending: false }).limit(400)) : [],
  ]) as any[];
  const u = await urls([...pets.map(p => p.foto_path), ...diario.map((d: any) => d.foto_path)]);
  return {
    tutor: { nome: tutor.nome, whatsapp: tutor.whatsapp, email: tutor.email, endereco: tutor.endereco, bairro: tutor.bairro, cidade: tutor.cidade }, hoje: hojeBR(),
    contato: { whatsapp: cfg?.whatsapp, instagram: cfg?.instagram },
    pix: cfg?.pix_chave ? { chave: cfg.pix_chave, nome: cfg.pix_nome, cidade: cfg.pix_cidade } : null,
    pets: pets.map(({ foto_path, ...p }) => ({ ...p, foto: foto_path ? u[foto_path] || null : null })),
    propostas: props.map(p => ({ ...p, pets: (p.proposta_pets || []).map((x: any) => x.pet_id), proposta_pets: undefined,
      pagamentos: pagtos.filter((g: any) => g.proposta_id === p.id), avaliacao: avals.find((v: any) => v.proposta_id === p.id) || null })),
    diario: diario.map(({ foto_path, ...d }: any) => ({ ...d, foto: foto_path ? u[foto_path] || null : null })),
  };
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erro: "Use POST" }, 405);
  try {
    const len = Number(req.headers.get("content-length") || 0);
    if (len > 6_000_000) throw new Erro("Arquivo grande demais", 413);
    const body = await req.json().catch(() => { throw new Erro("Pedido inválido"); });
    const a = await acessoDoToken(body.token);
    const acao = String(body.acao || "dados");

    if (acao === "dados") {
      await sb.from("tutor_acessos").update({ ultimo_acesso: new Date().toISOString(), acessos: (a.acessos || 0) + 1 }).eq("id", a.id);
      return json(await dados(a));
    }
    if (acao === "aceite") {
      if (!a.aceite_em) await chk(sb.from("tutor_acessos").update({ aceite_em: new Date().toISOString() }).eq("id", a.id));
      return json(await dados({ ...a, aceite_em: a.aceite_em || new Date().toISOString() }));
    }
    if (!a.aceite_em) throw new Erro("Confirme o aviso de privacidade primeiro", 403);

    if (acao === "ficha") {
      const pets = await petsDoTutor(a.tutor_id);
      if (!pets.some(p => p.id === body.pet_id)) throw new Erro("Pet não encontrado", 404);
      const row: Record<string, unknown> = { atualizado_tutor_em: new Date().toISOString() };
      const c = body.campos || {};
      for (const k of FICHA) if (k in c) row[k] = texto(c[k], k === "raca" || k === "idade" ? 60 : 1000);
      if ("porte" in c) { if (!PORTES.includes(String(c.porte))) throw new Erro("Porte inválido"); row.porte = c.porte; }
      if ("nome" in c) { // o nome só pode ser preenchido pelo tutor quando está vazio
        const atual = pets.find(p => p.id === body.pet_id)?.nome; const novo = texto(c.nome, 40);
        if (String(atual || "").trim() || !novo) throw new Erro("O nome já está preenchido. Para mudar, fale com a Lari."); row.nome = novo;
      }
      await chk(sb.from("pets").update(row).eq("id", body.pet_id));
      return json({ ok: true });
    }
    if (acao === "tutor") {
      const c = body.campos || {}; const row: Record<string, unknown> = {};
      for (const k of TUTOR) if (k in c) row[k] = texto(c[k], k === "endereco" ? 200 : 100);
      if (row.whatsapp && String(row.whatsapp).replace(/\D/g, "").length < 10) throw new Erro("Confira o WhatsApp com DDD.");
      if (row.email && !/^\S+@\S+\.\S+$/.test(String(row.email))) throw new Erro("Confira o e-mail.");
      if (!Object.keys(row).length) throw new Erro("Nada para salvar");
      await chk(sb.from("tutores").update(row).eq("id", a.tutor_id));
      return json({ ok: true });
    }
    if (acao === "foto") {
      const pets = await petsDoTutor(a.tutor_id);
      const pet = pets.find(p => p.id === body.pet_id); if (!pet) throw new Erro("Pet não encontrado", 404);
      const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(body.imagem || ""));
      if (!m) throw new Erro("Imagem inválida");
      const bytes = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0));
      if (bytes.length > 4_000_000) throw new Erro("Foto grande demais", 413);
      const path = `${pet.id}/${Date.now()}.${m[1] === "jpeg" ? "jpg" : m[1]}`;
      const up = await sb.storage.from("pets").upload(path, bytes, { contentType: "image/" + m[1], cacheControl: "604800" });
      if (up.error) { console.error(up.error); throw new Erro("Não consegui guardar a foto", 500); }
      await chk(sb.from("pets").update({ foto_path: path, atualizado_tutor_em: new Date().toISOString() }).eq("id", pet.id));
      if (pet.foto_path && !String(pet.foto_path).startsWith("diario/")) await sb.storage.from("pets").remove([pet.foto_path]);
      const u = await urls([path]);
      return json({ ok: true, foto: u[path] || null });
    }
    if (acao === "aceitar") {
      const p = await propostaDoTutor(body.proposta_id, a.tutor_id);
      if (p.status !== "enviada") throw new Erro(p.status === "aceita" ? "Essa proposta já está confirmada" : "Essa proposta não está mais aberta");
      const payload = p.payload || {};
      const ops = Array.isArray(payload.opcoes) && payload.opcoes.length === 2 ? payload.opcoes : null;
      payload.aceita_pelo_tutor_em = new Date().toISOString();
      let row: Record<string, unknown> = { status: "aceita", payload };
      if (ops) {
        const o = ops.find((x: any) => x.n === Number(body.opcao)); if (!o) throw new Erro("Escolha uma das opções");
        payload.escolhida = o.n;
        row = { ...row, servico: o.servico, valor_total: o.valor_total, valor_cheio: Math.max(o.valor_cheio || 0, o.valor_total) };
        if (o.data_inicio) Object.assign(row, { data_inicio: o.data_inicio, data_fim: o.data_fim || o.data_inicio });
      }
      await chk(sb.from("propostas").update(row).eq("id", p.id).eq("status", "enviada"));
      // C-05: a opção escolhida pode ter só alguns pets
      const escolhida = ops ? ops.find((x: any) => x.n === Number(body.opcao)) : null;
      const ficam = (escolhida?.pet_ids || []).filter((x: unknown) => typeof x === "string" && /^[0-9a-f-]{36}$/i.test(x));
      if (ficam.length) {
        await chk(sb.from("proposta_pets").delete().eq("proposta_id", p.id).not("pet_id", "in", `(${ficam.join(",")})`));
      }
      return json(await dados(a));
    }
    if (acao === "avaliar") {
      const p = await propostaDoTutor(body.proposta_id, a.tutor_id);
      if (p.status !== "aceita") throw new Erro("Só dá para avaliar serviços confirmados");
      const nota = Math.round(Number(body.nota)); if (!(nota >= 1 && nota <= 5)) throw new Erro("Nota de 1 a 5");
      await chk(sb.from("avaliacoes").upsert({ proposta_id: p.id, tutor_id: a.tutor_id, nota, comentario: texto(body.comentario) }, { onConflict: "proposta_id" }));
      return json({ ok: true });
    }
    throw new Erro("Ação desconhecida");
  } catch (e) {
    const err = e instanceof Erro ? e : new Erro("Erro inesperado", 500);
    if (!(e instanceof Erro)) console.error(e);
    return json({ erro: err.message }, err.status);
  }
});
