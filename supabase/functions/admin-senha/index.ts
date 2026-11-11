// Pet Lar · Edge Function "admin-senha" (A-04): o administrador define uma senha provisória para
// outra pessoa do painel. A pessoa entra com ela e o painel obriga a criar uma senha nova.
// Só funciona para quem é administrador (confere no banco com o login de quem chamou)
// e só para e-mails que já estão em "Quem tem acesso".
import { createClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erro: "Use POST" }, 405);
  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ erro: "Entre no painel de novo." }, 401);
    const quem = createClient(URL, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const { data: u } = await quem.auth.getUser(auth.slice(7));
    if (!u?.user) return json({ erro: "Entre no painel de novo." }, 401);
    const { data: papel } = await quem.rpc("meu_papel");
    if (papel !== "admin") return json({ erro: "Só o administrador pode definir senha de outra pessoa." }, 403);

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const senha = String(body.senha || "");
    if (!/^\S+@\S+\.\S+$/.test(email)) return json({ erro: "E-mail inválido." }, 400);
    if (senha.length < 8 || senha.length > 72) return json({ erro: "A senha provisória precisa ter de 8 a 72 caracteres." }, 400);
    if (email === (u.user.email || "").toLowerCase()) return json({ erro: "Para a sua senha, use Minha conta." }, 400);

    const adm = createClient(URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: tem } = await adm.from("admins").select("email").eq("email", email).maybeSingle();
    if (!tem) return json({ erro: "Esse e-mail não está em Quem tem acesso." }, 404);

    // procura a conta (poucas contas: 2 páginas bastam)
    let alvo: { id: string; user_metadata?: Record<string, unknown> } | null = null;
    for (let page = 1; page <= 5 && !alvo; page++) {
      const { data, error } = await adm.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      alvo = data.users.find(x => (x.email || "").toLowerCase() === email) || null;
      if (data.users.length < 200) break;
    }
    const meta = { trocar_senha: true };
    if (alvo) {
      const { error } = await adm.auth.admin.updateUserById(alvo.id, { password: senha, email_confirm: true, user_metadata: { ...(alvo.user_metadata || {}), ...meta } });
      if (error) throw error;
      return json({ ok: true, criada: false });
    }
    const { error } = await adm.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: meta });
    if (error) throw error;
    return json({ ok: true, criada: true });
  } catch (e) {
    console.error(e);
    return json({ erro: "Não consegui definir a senha agora." }, 500);
  }
});
