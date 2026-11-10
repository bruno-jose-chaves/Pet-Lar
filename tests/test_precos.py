"""Tabela de preços v2.3 conferida no editor do app (banco simulado). Uso: python tests/test_precos.py"""
import threading, functools, http.server, socketserver, pathlib, socket, sys
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent; PUB = ROOT / "public"
FAKE = (ROOT / "tests" / "fake-supabase.js").read_text()
s = socket.socket(); s.bind(("127.0.0.1", 0)); PORT = s.getsockname()[1]; s.close()
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.ThreadingTCPServer.allow_reuse_address = True
srv = socketserver.ThreadingTCPServer(("127.0.0.1", PORT), functools.partial(H, directory=str(PUB))); srv.daemon_threads = True
threading.Thread(target=srv.serve_forever, daemon=True).start()
M = {"nome": "X", "porte": "M"}
CASOS = [
  ("Hospedagem 23→27/12 (5 diárias, 2 feriados), P", {"servico": "hosp", "h_in": "2026-12-23", "h_out": "2026-12-27"}, [{"nome": "Duque", "porte": "P"}], 540),
  ("Hospedagem 10→12/11 = 3 diárias", {"servico": "hosp", "h_in": "2026-11-10", "h_out": "2026-11-12"}, [M], 300),
  ("Hospedagem mesmo dia = 1 diária", {"servico": "hosp", "h_in": "2026-11-10", "h_out": "2026-11-10"}, [M], 100),
  ("Hospedagem 06/12→02/01 (28 diárias, -15%)", {"servico": "hosp", "h_in": "2026-12-06", "h_out": "2027-01-02"}, [M], 2380),
  ("Hospedagem com desconto especial 20%", {"servico": "hosp", "h_in": "2026-12-06", "h_out": "2027-01-02", "descManual": "20"}, [M], 2240),
  ("Hospedagem 06/12→03/01 = 29 diárias", {"servico": "hosp", "h_in": "2026-12-06", "h_out": "2027-01-03"}, [M], 2465),
  ("Visitas 6 dias, 2 gatos (Karina)", {"servico": "visitas", "v_ini": "2026-11-10", "v_fim": "2026-11-15"}, [{"nome": "A", "especie": "gato", "passeia": False}, {"nome": "B", "especie": "gato", "passeia": False}], 485),
  ("Visitas 7 dias (-5%)", {"servico": "visitas", "v_ini": "2026-11-10", "v_fim": "2026-11-16"}, [M], 465),
  ("Visitas 25 dias (-15%)", {"servico": "visitas", "v_ini": "2026-11-01", "v_fim": "2026-11-25"}, [M], 1490),
  ("Visitas 3 dias, 2 por dia (2ª -40%)", {"servico": "visitas", "v_ini": "2026-11-20", "v_fim": "2026-11-22", "v_dia": "2"}, [M], 335),
  ("Pacote 1x", {"servico": "pacote", "p_plano": "1"}, [M], 265),
  ("Pacote 3x", {"servico": "pacote", "p_plano": "3"}, [M], 820),
  ("Pacote 5x", {"servico": "pacote", "p_plano": "5"}, [M], 1250),
  ("Pacote outro 2x", {"servico": "pacote", "p_plano": "outro", "p_outro": "2"}, [M], 600),
  ("Pacote outro 4x", {"servico": "pacote", "p_plano": "outro", "p_outro": "4"}, [M], 1070),
  ("Pacote outro 7x", {"servico": "pacote", "p_plano": "outro", "p_outro": "7"}, [M], 1785),
  ("Pacote outro 10x", {"servico": "pacote", "p_plano": "outro", "p_outro": "10"}, [M], 2250),
  ("Banho M quinzenal", {"servico": "banho", "b_plano": "quinzenal"}, [M], 215),
  ("Visita estendida em Itajaí (+R$ 30)", {"servico": "estendida", "e_qtd": 1, "cidade": "Itajaí"}, [M], 180),
  ("Outra cidade R$ 50 × 3 visitas", {"servico": "visitas", "cidade": "outra", "cidadeNome": "Navegantes", "deslocValor": 50, "v_ini": "2026-11-10", "v_fim": "2026-11-12"}, [M], 360),
  ("Adicional +15% em hospedagem de 5 dias", {"servico": "hosp", "h_in": "2026-11-10", "h_out": "2026-11-14", "adds": [{"id": "a", "desc": "Cardíaco", "tipo": "pct", "valor": "15", "mostrar": True}]}, [M], 575),
]
ok = 0
with sync_playwright() as p:
    br = p.chromium.launch(); ctx = br.new_context()
    ctx.route("**/vendor/supabase.js", lambda r: r.fulfill(body=FAKE, content_type="application/javascript"))
    pg = ctx.new_page(); pg.goto(f"http://127.0.0.1:{PORT}/#/proposta/nova"); pg.wait_for_function("window.G", timeout=30000)
    for nome, st, pets, exp in CASOS:
        got = pg.evaluate("""([st,pets])=>{ const S=Object.assign(G.blank(),st); S.pets=pets.map(x=>Object.assign(G.newPet(),x)); const o=G.S; G.S=S; const r=G.calc(); G.S=o; return r.final; }""", [st, pets])
        good = got == exp; ok += good
        print(("OK  " if good else "ERR ") + f"{nome}: R$ {got}" + ("" if good else f" (esperado {exp})"))
    br.close()
srv.shutdown()
print(f"\n{ok}/{len(CASOS)} ok"); sys.exit(0 if ok == len(CASOS) else 1)
