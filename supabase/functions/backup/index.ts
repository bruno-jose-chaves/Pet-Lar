// Pet Lar · Edge Function "backup" — entrega uma cópia de todas as tabelas em JSON.
// Protegida por uma senha própria (segredo BACKUP_TOKEN, no cabeçalho x-backup-token).
// Sem o segredo configurado (ou com menos de 24 caracteres) a função fica desligada.
import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const TABELAS = ["tutores", "pets", "propostas", "proposta_pets", "pagamentos", "avaliacoes", "diario", "settings", "tutor_acessos", "admins", "erros"];
const resp = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extra } });

function igual(a: string, b: string) { // comparação em tempo constante
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let d = x.length ^ y.length; for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] ?? 0) ^ (y[i] ?? 0); return d === 0;
}

Deno.serve(async req => {
  const segredo = Deno.env.get("BACKUP_TOKEN") || "";
  if (segredo.length < 24) return resp({ erro: "Backup desligado" }, 503);
  const token = req.headers.get("x-backup-token") || "";
  if (!igual(token, segredo)) return resp({ erro: "Não autorizado" }, 401);
  try {
    const out: Record<string, unknown> = { gerado_em: new Date().toISOString(), projeto: "pet-lar" };
    const contagem: Record<string, number> = {};
    for (const t of TABELAS) {
      const linhas: unknown[] = [];
      for (let ini = 0; ; ini += 1000) {
        const { data, error } = await sb.from(t).select("*").range(ini, ini + 999);
        if (error) throw new Error(`${t}: ${error.message}`);
        linhas.push(...(data || [])); if (!data || data.length < 1000) break;
      }
      out[t] = linhas; contagem[t] = linhas.length;
    }
    out.contagem = contagem;
    return resp(out, 200, { "Content-Disposition": `attachment; filename="petlar-${out.gerado_em}.json"` });
  } catch (e) {
    console.error(e); return resp({ erro: "Falha ao gerar o backup" }, 500);
  }
});
