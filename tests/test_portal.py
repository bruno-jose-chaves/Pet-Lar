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
  "tutor": {"nome": "Sabrina Costa", "whatsapp": "(47) 98888-7777", "email": None, "endereco": None, "bairro": None, "cidade": "Balneário Camboriú"}, "hoje": hoje.isoformat(),
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
    ("comeu", -0.5, None, None), ("passeio", -0.4, "Passeio de 30 min na praia", None), ("foto", -0.3, "Olha ele no sofá", img), ("dormiu", -30, None, None), ("foto", -29, None, img), ("video", -28, "Correndo no quintal", "data:video/mp4;base64,AAAA")])],
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
  if a == "tutor": d["tutor"].update(req["campos"]); return ok({"ok": True})
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
    pg.goto(URL + "#" + TOKEN); pg.wait_for_timeout(1600)
    check(f"[{tam}] primeira vez: aviso de privacidade com o nome", "Oi, Sabrina!" in pg.inner_text("#pt") and "Sobre os seus dados" in pg.inner_text("#pt"))
    check(f"[{tam}] aviso sem barra de abas", pg.locator("#tabs").is_hidden())
    if tam == "cel": pg.screenshot(path=str(OUT / f"{tam}-portal-boasvindas.png"), full_page=True)
    sem_rolagem("aviso")
    tap("#ptOk"); pg.wait_for_timeout(900)

    # Início
    check(f"[{tam}] Início: barra com 5 abas", pg.locator("#tabs button").count() == 5 and pg.locator("#tabs button.on").inner_text().strip() == "Início")
    check(f"[{tam}] Início: pet em destaque (Bento, com a Lari agora)", pg.inner_text(".pt-heroi h1") == "Bento" and "Com a Lari agora" in pg.inner_text(".pt-status"))
    check(f"[{tam}] Início: escolher entre Bento e Nina", pg.locator(".pt-troca button").count() == 2)
    check(f"[{tam}] Início: o dia do Bento marca comeu e passeio", pg.locator(".pt-rotina li.feito").count() == 2 and "O dia do Bento" in pg.inner_text(".pt-bloco h2"))
    check(f"[{tam}] Início: aviso de orçamento esperando resposta", pg.locator(".pt-aviso[data-orc]").count() == 1)
    check(f"[{tam}] Início: foto mais recente", pg.locator(".pt-ultfoto img").count() == 1)
    check(f"[{tam}] Início: ponto na aba Mais (orçamento aberto)", pg.locator("#tabs .pt-ponto").count() == 1)
    check(f"[{tam}] o código do link não aparece na tela", TOKEN not in pg.inner_text("body"))
    sem_rolagem("Início")
    pg.screenshot(path=str(OUT / f"{tam}-portal.png"), full_page=True)
    pg.click(".pt-troca [data-petsel='p2']"); pg.wait_for_timeout(300)
    check(f"[{tam}] trocar para a Nina", pg.inner_text(".pt-heroi h1") == "Nina")
    pg.click(".pt-troca [data-petsel='p1']"); pg.wait_for_timeout(200)

    # Diário
    pg.click("#tabs [data-ir=diario]"); pg.wait_for_timeout(400)
    check(f"[{tam}] Diário: dias e registros de hoje", pg.locator(".pt-dias button").count() == 2 and pg.locator(".pt-tl-i").count() == 3)
    check(f"[{tam}] aba no endereço sem perder o código", "aba=diario" in pg.evaluate("location.search") and TOKEN in pg.evaluate("location.hash"))
    pg.locator(".pt-dias button").nth(1).click(); pg.wait_for_timeout(300)
    check(f"[{tam}] Diário: dia anterior com foto e vídeo", pg.locator(".pt-tl-i").count() == 3 and pg.locator(".pt-tl-i video").count() == 1)
    if tam == "cel": pg.screenshot(path=str(OUT / f"{tam}-portal-diario.png"), full_page=True)
    sem_rolagem("Diário")

    # Fotos + visor
    pg.click("#tabs [data-ir=fotos]"); pg.wait_for_timeout(400)
    check(f"[{tam}] Fotos: grade com 2 fotos e 1 vídeo", pg.locator(".pt-grade button").count() == 3 and pg.locator(".pt-grade .pt-play").count() == 1 and "1 vídeo" in pg.inner_text(".pt-tit"))
    pg.locator(".pt-grade button").first.click(); pg.wait_for_timeout(300)
    check(f"[{tam}] foto abre em tela cheia (1 de 2)", pg.locator(".pt-visor").count() == 1 and "1 de 3" in pg.inner_text(".pt-visor-top"))
    pg.keyboard.press("ArrowRight"); pg.wait_for_timeout(200)
    check(f"[{tam}] passa para a próxima foto", "2 de 3" in pg.inner_text(".pt-visor-top"))
    pg.keyboard.press("ArrowRight"); pg.wait_for_timeout(200)
    check(f"[{tam}] vídeo toca no visor", pg.locator(".pt-visor video[controls]").count() == 1)
    if tam == "cel": pg.screenshot(path=str(OUT / f"{tam}-portal-visor.png"))
    pg.click(".pt-visor [data-v=x]"); pg.wait_for_timeout(200)
    check(f"[{tam}] fecha o visor", pg.locator(".pt-visor").count() == 0)

    # voltar do navegador
    pg.go_back(); pg.wait_for_timeout(400)
    check(f"[{tam}] botão voltar do celular volta de aba", pg.locator("#tabs button.on").inner_text().strip() == "Diário")

    # Pets + ficha
    pg.click("#tabs [data-ir=pets]"); pg.wait_for_timeout(300)
    check(f"[{tam}] Pets: Bento e Nina com o que falta na ficha", pg.locator(".pt-petcard").count() == 2 and "Falta preencher" in pg.inner_text(".pt-pets"))
    pg.click(".pt-petcard[data-pet='p2']"); pg.wait_for_timeout(300)
    check(f"[{tam}] ficha da Nina abre com dados e rotina", pg.inner_text(".pt-tit h1") == "Nina" and pg.locator(".pt-campo").count() == 10 and pg.locator("[data-editar=nome]").count() == 0)
    pg.click("[data-editar=idade]"); pg.wait_for_timeout(200); pg.fill("[data-salvar=idade] input", "2 anos"); pg.click("[data-salvar=idade] [type=submit]"); pg.wait_for_timeout(600)
    ult = st["chamadas"][-1]
    check(f"[{tam}] ficha: tutor completa a idade", ult.get("acao") == "ficha" and ult["campos"] == {"idade": "2 anos"} and "2 anos" in pg.inner_text("[data-campo=idade]"))
    pg.click("[data-editar=porte]"); pg.wait_for_timeout(200); pg.click("[data-salvar=porte] label:has-text('Pequeno')"); pg.click("[data-salvar=porte] [type=submit]"); pg.wait_for_timeout(600)
    check(f"[{tam}] ficha: escolhe o porte", st["chamadas"][-1]["campos"] == {"porte": "P"})
    pg.click("[data-editar=alimentacao]"); pg.wait_for_timeout(200); pg.fill("[data-salvar=alimentacao] textarea", "Sachê 2x ao dia"); pg.click("[data-salvar=alimentacao] [type=submit]"); pg.wait_for_timeout(700)
    ult = st["chamadas"][-1]
    check(f"[{tam}] ficha: salva um campo por vez", ult.get("acao") == "ficha" and ult.get("pet_id") == "p2" and ult["campos"] == {"alimentacao": "Sachê 2x ao dia"} and "Sachê 2x ao dia" in pg.inner_text("[data-campo=alimentacao]"))
    with pg.expect_file_chooser() as fc: pg.click("[data-trocafoto='p2']")
    fc.value.set_files(str(ROOT / "tests" / "foto_teste.jpg")); pg.wait_for_timeout(1500)
    ult = st["chamadas"][-1]
    check(f"[{tam}] foto nova do pet enviada (reduzida, JPEG)", ult.get("acao") == "foto" and ult.get("imagem", "").startswith("data:image/jpeg") and len(ult["imagem"]) < 1_500_000)
    check(f"[{tam}] foto nova aparece na ficha", pg.locator(".pt-ficha-foto img").count() == 1)
    if tam == "cel": pg.screenshot(path=str(OUT / f"{tam}-portal-ficha.png"), full_page=True)
    sem_rolagem("Ficha")
    pg.click(".pt-volta"); pg.wait_for_timeout(300)
    check(f"[{tam}] voltar da ficha para a lista", pg.locator(".pt-petcard").count() == 2)

    # Mais + orçamento com duas opções
    pg.click("#tabs [data-ir=mais]"); pg.wait_for_timeout(300)
    check(f"[{tam}] Mais: orçamento, confirmados, pagamentos e anteriores", all(x in pg.inner_text("#pt") for x in ["Orçamentos para responder", "Cuidados confirmados", "Pagamentos", "Cuidados anteriores"]))
    if tam == "cel": pg.screenshot(path=str(OUT / f"{tam}-portal-mais.png"), full_page=True)
    pg.click("[data-editar=endereco][data-ent=tutor]"); pg.wait_for_timeout(200); pg.fill("[data-salvar=endereco] textarea", "Rua 2000, 123, ap 41"); pg.click("[data-salvar=endereco] [type=submit]"); pg.wait_for_timeout(600)
    ult = st["chamadas"][-1]
    check(f"[{tam}] Seus dados: tutor completa o endereço", ult.get("acao") == "tutor" and ult["campos"] == {"endereco": "Rua 2000, 123, ap 41"} and "Rua 2000" in pg.inner_text("#seusDados"))
    pg.click("[data-orc='q3']"); pg.wait_for_timeout(300)
    check(f"[{tam}] orçamento: duas opções com preço", pg.locator(".pt-op").count() == 2 and "R$ 420" in pg.inner_text(".pt-ops"))
    if tam == "cel": pg.screenshot(path=str(OUT / f"{tam}-portal-orcamento.png"), full_page=True)
    pg.locator("[data-op='2']").click(); pg.wait_for_timeout(400)
    check(f"[{tam}] confirmação mostra opção e sinal", "opção 2" in pg.inner_text(".modal") and "R$ 210" in pg.inner_text(".modal"))
    pg.click(".modal [data-ok]"); pg.wait_for_timeout(1500)
    ult = st["chamadas"][-1]
    check(f"[{tam}] aceite enviado com a opção 2", ult.get("acao") == "aceitar" and ult.get("opcao") == 2 and ult.get("proposta_id") == "q3")
    check(f"[{tam}] abre o Pix do sinal com QR", "Pix do sinal" in pg.inner_text(".modal") and pg.locator(".modal .pt-qr").count() == 1)
    if tam == "cel": pg.screenshot(path=str(OUT / f"{tam}-portal-pix.png"))
    pg.click(".modal [data-copiar]"); pg.wait_for_timeout(300)
    check(f"[{tam}] copiar código Pix avisa", pg.locator(".toast").count() >= 1)
    pg.click(".modal [data-close]"); pg.wait_for_timeout(300)
    check(f"[{tam}] volta ao Início com aviso do sinal e sem orçamento pendente", pg.locator(".pt-aviso[data-orc]").count() == 0 and pg.locator(".pt-aviso.pix").count() == 1)
    check(f"[{tam}] aviso do Pix fica no fim da página", pg.evaluate("(() => { const c = document.querySelector('.pt-corpo'); return c.lastElementChild.classList.contains('pix'); })()"))

    # avaliação
    pg.click("#tabs [data-ir=mais]"); pg.wait_for_timeout(300)
    pg.click("[data-avaliar]"); pg.wait_for_timeout(300)
    pg.click(".pt-escolher [data-n='5']"); pg.fill(".modal textarea", "Amamos!"); pg.click(".modal [data-env]"); pg.wait_for_timeout(700)
    ult = st["chamadas"][-1]
    check(f"[{tam}] avaliação 5 estrelas enviada", ult.get("acao") == "avaliar" and ult.get("nota") == 5 and ult.get("comentario") == "Amamos!")
    check(f"[{tam}] estrelas aparecem no lugar do botão", pg.locator("[data-avaliar]").count() == 0 and pg.locator(".pt-hist .pt-estrelas").count() == 1)
    pg.click("#ptSalvar"); pg.wait_for_timeout(300)
    check(f"[{tam}] explica como salvar na tela do celular", "Adicionar" in pg.inner_text(".modal"))
    pg.click(".modal [data-close]"); pg.wait_for_timeout(200)

    # reabrir sem o # (ícone na tela de início): usa o código guardado
    pg.goto(URL); pg.wait_for_timeout(1000)
    check(f"[{tam}] reabre sem o código no endereço (guardado no aparelho)", pg.locator(".pt-heroi").count() == 1)
    sem_rolagem("depois das ações")
    check(f"[{tam}] sem erros de JavaScript", not errs, " | ".join(errs)[:300])
    ctx.close()
  br.close()
bad = [n for ok, n in results if not ok]
print(f"\n{len(results) - len(bad)}/{len(results)} ok ({engine})")
sys.exit(1 if bad else 0)
