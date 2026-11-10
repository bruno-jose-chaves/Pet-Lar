// Supabase falso, em memória, para testar as telas sem tocar no banco real.
// Imita o subconjunto do PostgREST/Auth/Storage que o app usa (filtros, joins, contagem, triggers do banco).
(function () {
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "id-" + Math.random().toString(36).slice(2));
  const nowISO = () => new Date().toISOString();
  const today = () => new Date().toISOString().slice(0, 10);
  const T = window.__FAKE_DB = window.__FAKE_DB || {
    settings: [{ id: 1, pix_chave: null, pix_nome: "Larissa", pix_cidade: "BALNEARIO CAMBORIU", whatsapp: "(47) 99917-9091", instagram: "@petlar.bc", capacidade_hospedagem: 3, follow_up_dias: 2, expira_dias: 15 }],
    admins: [{ email: "teste@petlar.app", nome: "Teste", papel: window.__FAKE_PAPEL || "admin", created_at: nowISO() }],
    tutores: [], pets: [], propostas: [], proposta_pets: [], pagamentos: [], diario: [],
  };
  const STORE = window.__FAKE_STORE = window.__FAKE_STORE || {};
  window.__FAKE_LOG = window.__FAKE_LOG || [];

  // relações (embed) disponíveis
  const REL = {
    propostas: { proposta_pets: { t: "proposta_pets", many: true, fk: "proposta_id" }, tutores: { t: "tutores", one: "tutor_id" } },
    proposta_pets: { pets: { t: "pets", one: "pet_id" }, propostas: { t: "propostas", one: "proposta_id" } },
    pets: { tutores: { t: "tutores", one: "tutor_id" } },
    tutores: { pets: { t: "pets", many: true, fk: "tutor_id" }, propostas: { t: "propostas", many: true, fk: "tutor_id" } },
    pagamentos: { propostas: { t: "propostas", one: "proposta_id" } },
  };
  function parseSel(s) { // "a,b,rel(x,y,rel2(z))" -> [{col}|{rel, sub}]
    const out = []; let i = 0, buf = "";
    while (i < s.length) {
      const c = s[i];
      if (c === "(") { let d = 1, j = i + 1; while (d) { if (s[j] === "(") d++; if (s[j] === ")") d--; j++; } out.push({ rel: buf.trim(), sub: parseSel(s.slice(i + 1, j - 1)) }); buf = ""; i = j; if (s[i] === ",") i++; continue; }
      if (c === ",") { if (buf.trim()) out.push({ col: buf.trim() }); buf = ""; i++; continue; }
      buf += c; i++;
    }
    if (buf.trim()) out.push({ col: buf.trim() }); return out;
  }
  function project(table, row, sel) {
    const o = {};
    for (const s of sel) {
      if (s.col) {
        if (s.col === "*") { Object.assign(o, row); continue; }
        const m = s.col.match(/^(\w+):(\w+)->>?(\w+)$/); if (m) { const v = row[m[2]]?.[m[3]]; o[m[1]] = v === undefined ? null : (s.col.includes("->>") && v !== null && typeof v !== "string" ? String(v) : v); continue; }
        o[s.col] = row[s.col] ?? null; continue;
      }
      const r = REL[table][s.rel]; if (!r) throw { code: "PGRST200", message: "relação desconhecida " + s.rel };
      if (r.many) o[s.rel] = T[r.t].filter(x => x[r.fk] === row.id).map(x => project(r.t, x, s.sub));
      else { const x = T[r.t].find(y => y.id === row[r.one] || (r.t === "pets" && y.id === row.pet_id) || (r.t === "propostas" && y.id === row.proposta_id)); o[s.rel] = x ? project(r.t, x, s.sub) : null; }
    }
    return o;
  }
  const like = (v, p) => new RegExp("^" + p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*") + "$", "i").test(String(v ?? ""));
  function trigInsert(t, r) {
    if (t === "propostas") {
      const ano = new Date().getFullYear(); const seq = Math.max(0, ...T.propostas.filter(p => p.ano === ano).map(p => p.seq)) + 1;
      Object.assign(r, { ano, seq, numero: "PL-" + ano + "-" + String(seq).padStart(3, "0"), status: r.status || "rascunho", valor_total: r.valor_total ?? 0, valor_cheio: r.valor_cheio ?? 0, payload: r.payload || {}, enviada_em: null, respondida_em: null });
    }
    if (t === "pets") Object.assign(r, { especie: r.especie || "cao", porte: r.porte || "P", passeia: r.passeia ?? true, ativo: r.ativo ?? true, reativo: r.reativo ?? false });
    if (t === "pagamentos") r.pago_em = r.pago_em ?? null;
  }
  function trigUpdate(t, old, r) {
    if (t === "propostas" && r.status !== old.status) {
      if (r.status === "enviada" && !r.enviada_em) r.enviada_em = nowISO();
      if (["aceita", "recusada"].includes(r.status)) r.respondida_em = nowISO();
      if (r.status === "aceita" && !T.pagamentos.some(g => g.proposta_id === r.id)) {
        const s = Math.round(Number(r.valor_total) / 2 * 100) / 100;
        T.pagamentos.push({ id: uid(), proposta_id: r.id, descricao: "Sinal (50%)", valor: s, vencimento: today(), pago_em: null, forma: null, created_at: nowISO() });
        T.pagamentos.push({ id: uid(), proposta_id: r.id, descricao: "Saldo (50%)", valor: Number(r.valor_total) - s, vencimento: r.data_fim || r.data_inicio || today(), pago_em: null, forma: null, created_at: nowISO() });
      }
    }
  }
  class Q {
    constructor(t) { this.t = t; this.f = []; this.op = "select"; this.sel = "*"; this.ord = []; }
    select(s = "*", o = {}) { if (this.op === "select") this.op = "select"; this.sel = s; this.count = o.count; this.head = o.head; this.ret = true; return this; }
    insert(v) { this.op = "insert"; this.val = Array.isArray(v) ? v : [v]; return this; }
    update(v) { this.op = "update"; this.val = v; return this; }
    delete() { this.op = "delete"; return this; }
    eq(c, v) { this.f.push(r => r[c] === v || String(r[c]) === String(v)); return this; }
    neq(c, v) { this.f.push(r => r[c] !== v); return this; }
    lt(c, v) { this.f.push(r => r[c] != null && r[c] < v); return this; }
    lte(c, v) { this.f.push(r => r[c] != null && r[c] <= v); return this; }
    gt(c, v) { this.f.push(r => r[c] != null && r[c] > v); return this; }
    gte(c, v) { this.f.push(r => r[c] != null && r[c] >= v); return this; }
    is(c, v) { this.f.push(r => (r[c] ?? null) === v); return this; }
    in(c, vs) { this.f.push(r => vs.includes(r[c])); return this; }
    ilike(c, p) { this.f.push(r => like(r[c], p)); return this; }
    or(s) { const parts = s.split(",").map(x => x.split(".")); this.f.push(r => parts.some(([c, op, ...v]) => op === "ilike" && like(r[c], v.join(".")))); return this; }
    order(c, o = {}) { this.ord.push([c, o.ascending !== false]); return this; }
    range(a, b) { this.rng = [a, b]; return this; }
    limit(n) { this.lim = n; return this; }
    single() { this.one = true; return this; }
    then(res, rej) { return Promise.resolve().then(() => this.run()).then(res, rej); }
    run() {
      window.__FAKE_LOG.push(this.t + ":" + this.op);
      if (window.__FAKE_FAIL && window.__FAKE_FAIL(this)) return { data: null, error: { message: "falha simulada" } };
      const rows = T[this.t]; if (!rows) return { data: null, error: { message: "tabela " + this.t } };
      const match = rows.filter(r => this.f.every(fn => fn(r)));
      let out;
      if (this.op === "insert") {
        out = this.val.map(v => { const r = { id: uid(), created_at: nowISO(), updated_at: nowISO(), ...JSON.parse(JSON.stringify(v)) }; if (this.t === "admins") { delete r.id; if (rows.some(a => a.email === r.email)) throw { message: "duplicate key" }; } if (this.t === "proposta_pets") delete r.id; trigInsert(this.t, r); rows.push(r); return r; });
      } else if (this.op === "update") {
        out = match.map(r => { const old = { ...r }; Object.assign(r, JSON.parse(JSON.stringify(this.val)), { updated_at: nowISO() }); trigUpdate(this.t, old, r); return r; });
      } else if (this.op === "delete") {
        match.forEach(r => rows.splice(rows.indexOf(r), 1));
        if (this.t === "propostas") match.forEach(p => { T.proposta_pets = T.proposta_pets.filter(x => x.proposta_id !== p.id); T.pagamentos = T.pagamentos.filter(x => x.proposta_id !== p.id); });
        if (this.t === "pets") match.forEach(p => { T.proposta_pets = T.proposta_pets.filter(x => x.pet_id !== p.id); });
        if (this.t === "tutores") match.forEach(t => { T.pets.forEach(p => { if (p.tutor_id === t.id) p.tutor_id = null; }); T.propostas.forEach(p => { if (p.tutor_id === t.id) p.tutor_id = null; }); });
        return { data: null, error: null };
      } else out = match;
      for (const [c, asc] of [...this.ord].reverse()) out = [...out].sort((a, b) => (a[c] ?? "") < (b[c] ?? "") ? (asc ? -1 : 1) : (a[c] ?? "") > (b[c] ?? "") ? (asc ? 1 : -1) : 0);
      const count = out.length;
      if (this.rng) out = out.slice(this.rng[0], this.rng[1] + 1);
      if (this.lim) out = out.slice(0, this.lim);
      if (this.head) return { data: null, count, error: null };
      let data = (this.ret || this.op === "select") ? out.map(r => project(this.t, r, parseSel(this.sel))) : null;
      if (this.one) { if (!data || data.length !== 1) return { data: null, error: { code: "PGRST116", message: "0 linhas" } }; data = data[0]; }
      return { data, count: this.count ? count : null, error: null };
    }
  }
  const session = { access_token: "fake", user: { id: "u1", email: "teste@petlar.app" } };
  let logged = !window.__FAKE_LOGGED_OUT;
  const subs = [];
  function rpc(fn, args) {
    if (fn === "meu_papel") { const a = T.admins.find(x => x.email === session.user.email); return Promise.resolve({ data: a ? a.papel || "admin" : null, error: null }); }
    if (fn === "email_autorizado") return Promise.resolve({ data: T.admins.some(a => a.email === String(args.p_email).toLowerCase()), error: null });
    if (fn === "painel_resumo") {
      const d = args.p_hoje, ac = T.propostas.filter(p => p.status === "aceita");
      const dd = new Date(d); dd.setDate(dd.getDate() + 7); const d7 = dd.toISOString().slice(0, 10);
      const env = T.propostas.filter(p => p.status === "enviada"); const mes = d.slice(0, 7);
      return Promise.resolve({ error: null, data: {
        hospedados_hoje: ac.filter(p => p.servico === "hosp" && p.data_inicio <= d && (p.data_fim || p.data_inicio) >= d).length,
        servicos_hoje: ac.filter(p => p.data_inicio <= d && (p.data_fim || p.data_inicio) >= d).length,
        proximos_7: ac.filter(p => p.data_inicio > d && p.data_inicio <= d7).length,
        aguardando: env.length, aguardando_valor: env.reduce((a, p) => a + Number(p.valor_total), 0),
        a_receber: T.pagamentos.filter(g => !g.pago_em).reduce((a, g) => a + Number(g.valor), 0),
        recebido_mes: T.pagamentos.filter(g => g.pago_em && g.pago_em.slice(0, 7) === mes).reduce((a, g) => a + Number(g.valor), 0),
        follow_up: env.filter(p => p.enviada_em && Date.now() - new Date(p.enviada_em) > 2 * 86400000).length } });
    }
    return Promise.resolve({ data: null, error: { message: "rpc " + fn } });
  }
  const storage = { from: () => ({
    upload: async (path, blob) => { STORE[path] = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); }); return { data: { path }, error: null }; },
    remove: async ps => { ps.forEach(p => delete STORE[p]); return { data: null, error: null }; },
    createSignedUrls: async ps => ({ data: ps.map(p => ({ path: p, signedUrl: STORE[p] || null })), error: null }),
    download: async p => STORE[p] ? { data: await (await fetch(STORE[p])).blob(), error: null } : { data: null, error: { message: "not found" } },
  }) };
  const auth = {
    getSession: async () => ({ data: { session: logged ? session : null } }),
    getUser: async () => ({ data: { user: logged ? session.user : null } }),
    onAuthStateChange: cb => { subs.push(cb); setTimeout(() => cb(logged ? "SIGNED_IN" : "INITIAL_SESSION", logged ? session : null), 0); return { data: { subscription: { unsubscribe() { } } } }; },
    signInWithPassword: async ({ email, password }) => { if (email === "teste@petlar.app" && password === "senha123") { logged = true; subs.forEach(c => c("SIGNED_IN", session)); return { data: { session }, error: null }; } return { data: null, error: { message: "Invalid login credentials" } }; },
    signOut: async () => { logged = false; subs.forEach(c => c("SIGNED_OUT", null)); return { error: null }; },
    signUp: async () => ({ data: { session: null, user: {} }, error: null }),
    resetPasswordForEmail: async () => ({ error: null }),
    updateUser: async () => ({ data: {}, error: null }),
  };
  window.supabase = { createClient: () => ({ from: t => new Q(t), rpc, storage, auth }) };
})();
