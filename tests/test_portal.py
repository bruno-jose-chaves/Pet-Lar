"""Teste da área do tutor (public/t/) com a Edge Function "portal" simulada.
Uso: python tests/test_portal.py [webkit|chromium]
Confere: aviso de privacidade, orçamento com duas opções, aceite + Pix, diário, fotos, ficha, foto do pet,
avaliação, link inválido, celular (iPhone) e computador sem rolagem lateral. Salva prints em tests/output/telas/.
"""
import sys, json, copy, base64, threading, functools, http.server, socketserver, pathlib, socket, datetime as dt
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUB = ROOT / "public"; OUT = ROOT / "tests" / "output" / "telas"; OUT.mkdir(parents=True, exist_ok=True)
_s = socket.socket(); _s.bind(("127.0.0.1", 0)); PORT = _s.getsockname()[1]; _s.close()
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.ThreadingTCPServer(("127.0.0.1", PORT), functools.partial(Quiet, directory=str(PUB)))
srv.daemon_threads = True; threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{PORT}/t/"
TOKEN = "AbCdEfGhIjKlMnOpQrStUvWxYz012345"

hoje = dt.date.today(); D = lambda n: (hoje + dt.timedelta(days=n)).isoformat()
TS = lambda h: (dt.datetime.now() + dt.timedelta(hours=h)).astimezone(dt.timezone.utc).isoformat()
img = "data:image/jpeg;base64," + base64.b64encode((ROOT / "tests" / "foto_teste.jpg").read_bytes()).decode()

BASE = {
  "tutor": {"nome": "Sabrina Costa"}, "hoje": hoje.isoformat(),
  "contato": {"whatsapp": "(47) 99917-9091", "instagram": "@petlar.bc"},
  "pix": {"chave": "(47) 99917-9091", "nome": "Larissa", "cidade": "BALNEARIO CAMBORIU"},
  "pets": [{"id": "p1", "nome": "Bento", "especie": "cao", "raca": "Border collie", "idade": "4 anos", "porte": "M", "alimentacao": "Ração 150 g", "medicacao": None, "comportamento": None, "limitacoes": None, "veterinario": None, "observacoes": None, "atualizado_tutor_em": None, "foto": img},
           {"id": "p2", "nome": "Nina", "especie": "gato", "raca": "SRD", "idade": None, "porte": "P", "alimentacao": None, "medicacao": None, "comportamento": None, "limitacoes": None, "veterinario": None, "observacoes": None, "atualizado_tutor_em": None, "foto": None}],
  "propostas": [
    {"id": "q3", "numero": "PL-2026-003", "status": "enviada", "servico": "hosp", "data_inicio": D(10), "data_fim": D(14), "valor_total": 500, "valor_cheio": 500, "resumo": "Hospedagem ou visitas · Bento e Nina", "validade_ate": D(5), "pets": ["p1", "p2"], "recomendada": 1, "escolhida": None,
     "opcoes": [{"n": 1, "servico": "hosp", "titulo": "Hospedagem no Pet Lar", "valor_total": 500, "valor_cheio": 500, "data_inicio": D(10), "data_fim": D(14)}, {"n": 2, "servico": "visitas", "titulo": "Visitas em casa", "valor_total": 420, "valor_cheio": 420, "data_inicio": D(10), "data_fim": D(14)}], "pagamentos": [], "avaliacao": None},
    {"id": "q1", "numero": "PL-2026-001", "status": "aceita", "servico": "hosp", "data_inicio": D(-1), "data_fim": D(2), "valor_total": 400, "valor_cheio": 400, "resumo": "", "validade_ate": None, "pets": ["p1"], "opcoes": None,
     "pagamentos": [{"descricao": "Sinal (50%)", "valor": 200, "vencimento": D(-3), "pago_em": D(-3)}, {"descricao": "Saldo (50%)", "valor": 200, "vencimento": D(2), "pago_em": None}], "avaliacao": None},
    {"id": "q0", "numero": "PL-2026-000", "status": "aceita", "servico": "banho", "data_inicio": D(-20), "data_fim": D(-20), "valor_total": 120, "valor_cheio": 120, "resumo": "", "validade_ate": None, "pets": ["p1"], "opcoes": None, "pagamentos": [], "avaliacao": None},
  ],
  "diario": [{"id": f"d{i}", "pet_id": "p1", "proposta_id": "q1", "tipo": t, "nota": n, "foto": f, "criado_em": TS(h)} for i, (t, h, n, f) in enumerate([
    ("comeu", -0.5, None, None), ("passeio", -0.4, "Passeio de 30 min na praia", None), ("foto", -0.3, "Olha ele no sofá", img), ("dormiu", -30, None, None), ("foto", -29, None, img)])],
}

def criar_estado():
  return {"aceite": False, "dados": copy.deepcopy(BASE), "chamadas": []}

def responder(st, route):
  req = json.loads(route.request.post_data or "{}"); st["chamadas"].append(req)
  ok = lambda d: route.fulfill(status=200, content_type="application/json", body=json.dumps(d), headers={"Access-Control-Allow-Origin": "*"})
  err = lambda m, s: route.fulfill(status=s, content_type="application/json", body=json.dumps({"erro": m}), headers={"Access-Control-Allow-Origin": "*"})
  if route.request.method == "OPTIONS": return route.fulfill(status=200, headers={"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*"})
  if req.get("token") != TOKEN: return err("Este link não vale mais. Peça um novo para a Lari.", 401)
  a, d = req.get("acao", "dados"), st["dados"]
  if a == "aceite": st["aceite"] = True
  if not st["aceite"]:
    if a == "dados": return ok({"precisa_aceite": True, "tutor": d["tutor"], "contato": d["contato"]})
    return err("Confirme o aviso de privacidade primeiro", 403)
  if a in ("dados", "aceite"): return ok(d)
  if a == "aceitar":
    p = next(x for x in d["propostas"] if x["id"] == req["proposta_id"])
    o = next(x for x in p["opcoes"] if x["n"] == req["opcao"]) if p.get("opcoes") else None
    v = o["valor_total"] if o else p["valor_total"]
    p.update(status="aceita", valor_total=v, escolhida=req.get("opcao"), servico=o["servico"] if o else p["servico"],
             pagamentos=[{"descricao": "Sinal (50%)", "valor": v / 2, "vencimento": D(0), "pago_em": None}, {"descricao": "Saldo (50%)", "valor": v / 2, "vencimento": p["data_fim"], "pago_em": None}])
    return ok(d)
  if a == "ficha":
    pet = next(x for x in d["pets"] if x["id"] == req["pet_id"]); pet.update(req["campos"]); return ok({"ok": True})
  if a == "foto": return ok({"ok": True, "foto": img})
  if a == "avaliar":
    next(x for x in d["propostas"] if x["id"] == req["proposta_id"])["avaliacao"] = {"nota": req["nota"], "comentario": req.get("comentario")}; return ok({"ok": True})
  return err("Ação desconhecida", 400)

results = []
def check(name, cond, extra=""):
  results.append((bool(cond), name)); print(("OK  " if cond else "ERR ") + name + (f"  [{extra}]" if extra else ""), flush=True)

engine = sys.argv[1] if len(sys.argv) > 1 else "webkit"
with sync_playwright() as p:
  br = getattr(p, engine).launch()
  for tam, vp, mob in (("cel", {"width": 430, "height": 932}, True), ("pc", {"width": 1280, "height": 860}, False)):
    opts = dict(viewport=vp, device_scale_factor=2 if mob else 1, locale="pt-BR", has_touch=mob)
    if mob and engine == "webkit": opts.update(is_mobile=True, user_agent=p.devices["iPhone 15 Pro Max"]["user_agent"])
    ctx = br.new_context(**opts); st = criar_estado()
    ctx.route("**/functions/v1/portal", lambda r: responder(st, r))
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    tap = (lambda s: pg.tap(s)) if (mob and engine == "webkit") else (lambda s: pg.click(s))
    sem_rolagem = lambda nome: check(f"[{tam}] {nome}: sem rolagem lateral", pg.evaluate("document.documentElement.scrollWidth") <= vp["width"] + 1)

    # link inválido
    pg.goto(URL + "#codigoerradocodigoerrado123"); pg.wait_for_timeout(900)
    check(f"[{tam}] link inválido: explica e oferece falar com a Lari", "não vale mais" in pg.inner_text("#pt") and pg.locator("#pt a[href*='wa.me']").count() == 1)
    pg.evaluate("localStorage.clear()")
    # sem link nenhum
    pg.goto(URL); pg.wait_for_timeout(700)
    check(f"[{tam}] sem link: pede para usar o link do WhatsApp", "link que a Lari mandou" in pg.inner_text("#pt"))

    # aviso de privacidade
    pg.goto(URL + "#" + TOKEN); pg.wait_for_timeout(1000)
    check(f"[{tam}] primeira vez: aviso de privacidade com o nome", "Oi, Sabrina!" in pg.inner_text("#pt") and "Sobre os seus dados" in pg.inner_text("#pt"))
    if tam == "cel": pg.screenshot(path=str(OUT / f"{tam}-portal-boasvindas.png"), full_page=True)
    sem_rolagem("aviso")
    tap("#ptOk"); pg.wait_for_timeout(900)
    check(f"[{tam}] entrou: saudação e atalhos", "Sabrina!" in pg.inner_text(".pt-ola") and pg.locator(".pt-atalhos a").count() == 4)
    check(f"[{tam}] orçamento com duas opções", pg.locator(".pt-op").count() == 2 and "R$ 420" in pg.inner_text(".pt-ops"))
    check(f"[{tam}] agora com a Lari: Bento", "Agora com a Lari".upper() in pg.inner_text(".pt-agora").upper() and "Bento" in pg.inner_text(".pt-agora"))
    check(f"[{tam}] diário de hoje com 3 registros e foto", pg.locator("#diario > .pt-card .pt-tl-i").count() == 3 and pg.locator("#diario > .pt-card .pt-foto img").count() == 1)
    check(f"[{tam}] dias anteriores guardados", pg.locator(".pt-dias summary").count() == 1)
    check(f"[{tam}] galeria com as 2 fotos", pg.locator(".pt-galeria .pt-foto").count() == 2)
    check(f"[{tam}] meus pets: Bento e Nina", pg.locator(".pt-pet").count() == 2)
    check(f"[{tam}] serviço anterior com botão Avaliar", pg.locator("[data-avaliar]").count() == 1)
    check(f"[{tam}] botão falar com a Lari (WhatsApp)", "wa.me" in (pg.get_attribute(".pt-contato a.btn", "href") or ""))
    check(f"[{tam}] o código do link não aparece na tela", TOKEN not in pg.inner_text("body"))
    sem_rolagem("início")
    pg.screenshot(path=str(OUT / f"{tam}-portal.png"), full_page=True)

    # atalho não troca o # (o código do link fica no endereço)
    pg.click(".pt-atalhos a[href='#pets']"); pg.wait_for_timeout(500)
    check(f"[{tam}] atalho rola a página sem perder o código do link", TOKEN in pg.evaluate("location.hash"))

    # foto em tela cheia
    pg.locator(".pt-galeria .pt-foto").first.click(); pg.wait_for_timeout(400)
    check(f"[{tam}] foto abre grande", pg.locator(".modal .pt-foto-g").count() == 1)
    pg.click(".modal [data-close]"); pg.wait_for_timeout(300)

    # aceitar a opção 2 + Pix
    pg.locator("[data-op='2']").click(); pg.wait_for_timeout(400)
    check(f"[{tam}] confirmação mostra opção e sinal", "opção 2" in pg.inner_text(".modal") and "R$ 210" in pg.inner_text(".modal"))
    pg.click(".modal [data-ok]"); pg.wait_for_timeout(1500)
    ult = st["chamadas"][-1]
    check(f"[{tam}] aceite enviado com a opção 2", ult.get("acao") == "aceitar" and ult.get("opcao") == 2 and ult.get("proposta_id") == "q3")
    check(f"[{tam}] abre o Pix do sinal com QR e copia e cola", "Pix do sinal" in pg.inner_text(".modal") and pg.locator(".modal .pt-qr").count() == 1)
    if tam == "cel": pg.screenshot(path=str(OUT / f"{tam}-portal-pix.png"))
    pg.click(".modal [data-copiar]"); pg.wait_for_timeout(400)
    check(f"[{tam}] copiar código Pix avisa", pg.locator(".toast").count() >= 1)
    pg.click(".modal [data-close]"); pg.wait_for_timeout(400)
    check(f"[{tam}] orçamento saiu de 'para responder' e foi para próximos com Pix pendente", pg.locator(".pt-op").count() == 0 and pg.locator(".pt-prox [data-verpix]").count() == 1)

    # ficha
    pg.locator(".pt-pet[data-pet='p2'] .pt-ficha summary").click(); pg.wait_for_timeout(300)
    pg.fill(".pt-pet[data-pet='p2'] [name=alimentacao]", "Sachê 2x ao dia"); pg.fill(".pt-pet[data-pet='p2'] [name=veterinario]", "Dra. Paula (47) 3333-0000")
    pg.click(".pt-pet[data-pet='p2'] button[type=submit]"); pg.wait_for_timeout(800)
    ult = st["chamadas"][-1]
    check(f"[{tam}] ficha da Nina enviada", ult.get("acao") == "ficha" and ult.get("pet_id") == "p2" and ult["campos"].get("alimentacao") == "Sachê 2x ao dia")

    # foto do pet
    with pg.expect_file_chooser() as fc: pg.click(".pt-pet[data-pet='p2'] [data-trocafoto]")
    fc.value.set_files(str(ROOT / "tests" / "foto_teste.jpg")); pg.wait_for_timeout(1500)
    ult = st["chamadas"][-1]
    check(f"[{tam}] foto nova do pet enviada (reduzida, JPEG)", ult.get("acao") == "foto" and ult.get("imagem", "").startswith("data:image/jpeg") and len(ult["imagem"]) < 1_500_000)
    check(f"[{tam}] foto nova aparece", pg.locator(".pt-pet[data-pet='p2'] .pt-pet-foto img").count() == 1)

    # avaliação
    pg.click("[data-avaliar]"); pg.wait_for_timeout(400)
    pg.click(".pt-escolher [data-n='5']"); pg.fill(".modal textarea", "Amamos!"); pg.click(".modal [data-env]"); pg.wait_for_timeout(800)
    ult = st["chamadas"][-1]
    check(f"[{tam}] avaliação 5 estrelas enviada", ult.get("acao") == "avaliar" and ult.get("nota") == 5 and ult.get("comentario") == "Amamos!")
    check(f"[{tam}] estrelas aparecem no lugar do botão", pg.locator("[data-avaliar]").count() == 0 and pg.locator(".pt-estrelas.on").count() == 1)

    # como salvar na tela do celular
    pg.click("#ptSalvar"); pg.wait_for_timeout(300)
    check(f"[{tam}] explica como salvar na tela do celular", "Adicionar" in pg.inner_text(".modal"))
    pg.click(".modal [data-close]")

    # volta sem o # (ícone na tela de início): usa o código guardado
    pg.goto(URL); pg.wait_for_timeout(1000)
    check(f"[{tam}] reabre sem o código no endereço (guardado no aparelho)", "Sabrina!" in pg.inner_text("#pt"))
    sem_rolagem("depois das ações")
    check(f"[{tam}] sem erros de JavaScript", not errs, " | ".join(errs)[:300])
    ctx.close()
  br.close()
bad = [n for ok, n in results if not ok]
print(f"\n{len(results) - len(bad)}/{len(results)} ok ({engine})")
sys.exit(1 if bad else 0)
