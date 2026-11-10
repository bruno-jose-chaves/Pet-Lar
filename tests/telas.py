"""Varredura visual: abre todas as telas do painel (e do portal do tutor) com dados de exemplo,
no celular (430 px, iPhone) e no computador (1280 px), e salva prints em tests/output/telas/.
Também confere: rolagem lateral, botões fora da tela, textos cortados e erros de JavaScript.
Uso: python tests/telas.py [chromium|webkit]
"""
import sys, json, base64, threading, functools, http.server, socketserver, pathlib, socket, datetime as dt
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUB = ROOT / "public"; OUT = ROOT / "tests" / "output" / "telas"; OUT.mkdir(parents=True, exist_ok=True)
FAKE = (ROOT / "tests" / "fake-supabase.js").read_text()
_s = socket.socket(); _s.bind(("127.0.0.1", 0)); PORT = _s.getsockname()[1]; _s.close()
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.ThreadingTCPServer(("127.0.0.1", PORT), functools.partial(Quiet, directory=str(PUB)))
srv.daemon_threads = True; threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{PORT}/"

# ---------- dados de exemplo ----------
hoje = dt.date.today(); D = lambda n: (hoje + dt.timedelta(days=n)).isoformat()
agora = dt.datetime.now(dt.UTC).replace(tzinfo=None); TS = lambda h=0, d=0: (agora + dt.timedelta(hours=h, days=d)).isoformat() + "Z"
foto = "data:image/jpeg;base64," + base64.b64encode((pathlib.Path("/home/claude/dog_test.jpg") if pathlib.Path("/home/claude/dog_test.jpg").exists() else ROOT / "tests" / "foto_teste.jpg").read_bytes()).decode()
tut = [("t1", "Sabrina Costa", "(47) 98888-7777"), ("t2", "Carlos Mendes", "(47) 99123-4567"), ("t3", "Kenia Ramos", "(47) 99654-3210"), ("t4", "Marina Alves", "(47) 98765-1111")]
pets = [("p1", "t1", "Bento", "cao", "Border collie", "M", True), ("p2", "t1", "Nina", "gato", "SRD", "P", False),
        ("p3", "t2", "Zully", "cao", "Samoieda", "G", True), ("p4", "t3", "Filomena", "cao", "Shih-tzu", "P", True),
        ("p5", "t4", "Thor", "cao", "Golden", "G", True)]
store = {f"pets/{p[0]}.jpg": foto for p in pets if p[0] in ("p1", "p3", "p4")}
store["diario/p1/a.jpg"] = foto
db = {
  "settings": [{"id": 1, "pix_chave": "(47) 99917-9091", "pix_nome": "Larissa", "pix_cidade": "BALNEARIO CAMBORIU", "whatsapp": "(47) 99917-9091", "instagram": "@petlar.bc", "capacidade_hospedagem": 3, "follow_up_dias": 2, "expira_dias": 15}],
  "admins": [{"email": "teste@petlar.app", "nome": "Bruno", "papel": "admin", "created_at": TS()}, {"email": "larissa@petlar.app", "nome": "Larissa", "papel": "gestora", "created_at": TS()}],
  "tutores": [{"id": i, "nome": n, "whatsapp": w, "cidade": "Balneário Camboriú", "created_at": TS(d=-20), "updated_at": TS(d=-20)} for i, n, w in tut],
  "pets": [{"id": i, "tutor_id": t, "nome": n, "especie": e, "raca": r, "idade": "4 anos", "porte": po, "passeia": pa, "alimentacao": "Ração 150 g, 2x ao dia", "medicacao": "Apoquel 1/2 comp. à noite" if i == "p1" else None,
            "comportamento": "Dócil, tem medo de fogos", "limitacoes": None, "veterinario": "Dra. Paula · (47) 3333-0000", "reativo": False, "ativo": True, "foto_path": f"pets/{i}.jpg" if f"pets/{i}.jpg" in store else None, "observacoes": None, "created_at": TS(d=-20), "updated_at": TS(d=-20)} for i, t, n, e, r, po, pa in pets],
  "propostas": [], "proposta_pets": [], "pagamentos": [], "diario": [], "tutor_acessos": [],
}
def prop(pid, seq, t, petids, svc, ini, fim, valor, status, enviada=None, cob=0, resumo=""):
  tn = next(x for x in tut if x[0] == t)
  pl = {"tutor": tn[1], "cidade": "BC", "data": D(-3), "validade": 7, "servico": svc, "pets": [{"id": "x" + p, "pet_id": p, "foto_path": None, "nome": next(x for x in pets if x[0] == p)[2], "especie": next(x for x in pets if x[0] == p)[3], "raca": "", "idade": "", "porte": next(x for x in pets if x[0] == p)[5], "passeia": True, "alimentacao": "", "medicacao": "", "comportamento": "", "limitacoes": "", "veterinario": "", "reativo": False} for p in petids],
        "v_ini": ini if svc == "visitas" else "", "v_fim": fim if svc == "visitas" else "", "v_dia": "1", "v_combo": False, "p_plano": "3", "p_outro": "", "p_ini": "", "e_qtd": 1, "e_data": "", "h_in": ini if svc == "hosp" else "", "h_out": fim if svc == "hosp" else "", "h_leva": False,
        "b_plano": "avulso", "b_data": ini if svc == "banho" else "", "descManual": "", "valorFechado": "", "obs": "", "alt": None, "editando": 1, "recomendada": 1, "escolhida": None, "adds": [], "cidadeNome": "", "deslocValor": 30, "tutor_id": t, "tutorWhats": tn[2], "opcoes": None}
  db["propostas"].append({"id": pid, "created_at": TS(d=-5), "updated_at": TS(d=-1), "tutor_id": t, "tutor_nome": tn[1], "servico": svc, "data_inicio": ini, "data_fim": fim, "cidade": "Balneário Camboriú",
    "valor_total": valor, "valor_cheio": valor, "resumo": resumo, "validade_ate": D(5), "ano": hoje.year, "seq": seq, "numero": f"PL-{hoje.year}-{seq:03d}", "status": status,
    "enviada_em": enviada, "respondida_em": TS(d=-2) if status in ("aceita", "recusada") else None, "cobrancas": cob, "lembrar_em": None, "payload": pl})
  for p in petids: db["proposta_pets"].append({"proposta_id": pid, "pet_id": p, "created_at": TS(), "updated_at": TS()})
prop("q1", 1, "t1", ["p1", "p2"], "hosp", D(-1), D(3), 500, "aceita", TS(d=-6), resumo="Hospedagem no Pet Lar · Bento e Nina")
prop("q2", 2, "t2", ["p3"], "visitas", D(0), D(6), 465, "aceita", TS(d=-8), resumo="Visitas · 7 dias · Zully")
prop("q3", 3, "t3", ["p4"], "hosp", D(10), D(14), 500, "enviada", TS(d=-4), 1, resumo="Hospedagem · Filomena")
prop("q4", 4, "t4", ["p5"], "banho", D(4), D(4), 150, "enviada", TS(h=-5), resumo="Banho em casa · Thor")
prop("q5", 5, "t1", ["p1"], "visitas", D(20), D(25), 420, "rascunho", resumo="Visitas · Bento")
prop("q6", 6, "t2", ["p3"], "hosp", D(-30), D(-25), 600, "recusada", TS(d=-35), resumo="Hospedagem · Zully")
prop("q7", 7, "t4", ["p5"], "visitas", D(-14), D(-10), 350, "enviada", TS(d=-16), 2, resumo="Visitas · Thor")
for pid, v in (("q1", 500), ("q2", 465)):
  db["pagamentos"] += [{"id": pid + "s", "proposta_id": pid, "descricao": "Sinal (50%)", "valor": v / 2, "vencimento": D(-5), "pago_em": D(-5), "forma": "pix", "created_at": TS(), "updated_at": TS()},
                      {"id": pid + "f", "proposta_id": pid, "descricao": "Saldo (50%)", "valor": v / 2, "vencimento": D(3), "pago_em": None, "forma": "pix", "created_at": TS(), "updated_at": TS()}]
for i, (tipo, h, nota, fp) in enumerate([("chegou", -26, None, None), ("comeu", -5, None, None), ("passeio", -4, "Passeio de 30 min na praia", None), ("xixi", -4, None, None), ("foto", -3, "Olha ele no sofá", "diario/p1/a.jpg"), ("remedio", -2, "Apoquel", None), ("dormiu", -1, None, None)]):
  db["diario"].append({"id": f"d{i}", "proposta_id": "q1", "pet_id": "p1", "tipo": tipo, "nota": nota, "foto_path": fp, "criado_em": TS(h=h), "autor": "teste@petlar.app"})

INIT = "window.__FAKE_DB = " + json.dumps(db) + "; window.__FAKE_STORE = " + json.dumps(store) + ";"

TELAS = [("hoje", "#/hoje"), ("propostas", "#/propostas"), ("propostas-cliente", "#/propostas", "#fil [data-v=cliente]"), ("cobrar", "#/cobrar"),
         ("pets", "#/pets"), ("pet", "#/pet/p1"), ("tutores", "#/tutores"), ("tutor", "#/tutor/t1"), ("agenda", "#/agenda"),
         ("financeiro", "#/financeiro"), ("config", "#/config"), ("ajuda", "#/ajuda"), ("diario", "#/diario/q1"), ("servico", "#/proposta/q2"),
         ("proposta", "#/proposta/q3"), ("proposta-nova", "#/proposta/nova")]
MODAIS = [("menu-mais", "#/hoje", "#navMais"), ("filtros", "#/propostas", "[data-fabrir]"), ("proposta-menu", "#/proposta/q3", "#pMenu"),
          ("proposta-enviar", "#/proposta/q3", "#pEnviar"), ("diario-resumo", "#/diario/q1", "#dRel"), ("adiar", "#/cobrar", "[data-qa=adiar]")]

problemas = []
engine = sys.argv[1] if len(sys.argv) > 1 else "chromium"
with sync_playwright() as p:
  br = getattr(p, engine).launch()
  for nome_tam, vp, mob in (("cel", {"width": 430, "height": 932}, True), ("pc", {"width": 1280, "height": 860}, False)):
    opts = dict(viewport=vp, device_scale_factor=2 if mob else 1, locale="pt-BR", has_touch=mob)
    if mob and engine == "webkit": opts.update(is_mobile=True, user_agent=p.devices["iPhone 15 Pro Max"]["user_agent"])
    ctx = br.new_context(**opts)
    ctx.add_init_script(INIT)
    ctx.route("**/vendor/supabase.js", lambda r: r.fulfill(body=FAKE, content_type="application/javascript"))
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(1200)
    def checar(nome):
      r = pg.evaluate("""() => { const W = innerWidth, out = [];
        if (document.documentElement.scrollWidth > W + 1) out.push('rolagem lateral ' + document.documentElement.scrollWidth);
        document.querySelectorAll('button, a.btn, .qa-b, .chip, input, select').forEach(b => { const r = b.getBoundingClientRect();
          if (!r.width || getComputedStyle(b).visibility === 'hidden') return;
          if (r.right > W + 1 || r.left < -1) out.push('fora da tela: ' + (b.innerText || b.name || b.className).trim().slice(0, 30)); });
        document.querySelectorAll('.btn, .qa-b, .chip, .pill').forEach(b => { if (b.scrollWidth > b.clientWidth + 2 && getComputedStyle(b).overflow !== 'visible') out.push('texto cortado: ' + b.innerText.trim().slice(0, 30)); });
        return out; }""")
      for x in r: problemas.append(f"[{nome_tam}] {nome}: {x}")
    for t in TELAS:
      nome, h = t[0], t[1]
      pg.evaluate(f"location.hash = '{h}'"); pg.wait_for_timeout(1100)
      if len(t) > 2: pg.click(t[2]); pg.wait_for_timeout(500)
      checar(nome); pg.screenshot(path=str(OUT / f"{nome_tam}-{nome}.png"), full_page=True)
    for nome, h, sel in MODAIS:
      pg.evaluate(f"location.hash = '{h}'"); pg.wait_for_timeout(1100)
      if pg.locator(sel).count() == 0: problemas.append(f"[{nome_tam}] {nome}: botão {sel} não encontrado"); continue
      if not pg.locator(sel).first.is_visible(): continue  # ex.: "Mais" só existe no celular
      pg.locator(sel).first.click(); pg.wait_for_timeout(700)
      checar(nome); pg.screenshot(path=str(OUT / f"{nome_tam}-m-{nome}.png"))
      pg.keyboard.press("Escape"); pg.evaluate("document.querySelectorAll('.modal-bg').forEach(m => m.remove())")
    # portal do tutor (se existir)
    if (PUB / "t" / "index.html").exists():
      pg.goto(URL + "t/#tok-demo"); pg.wait_for_timeout(1500); checar("portal"); pg.screenshot(path=str(OUT / f"{nome_tam}-portal.png"), full_page=True)
    for e in errs: problemas.append(f"[{nome_tam}] erro JS: {e[:200]}")
    ctx.close()
  br.close()
print("\n".join(problemas) if problemas else "Nenhum problema encontrado.")
print(f"Prints em {OUT}")
