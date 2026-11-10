"""Desempenho: rede 3G lenta + CPU 4x mais lenta (celular simples). Mede o tempo até o app aparecer e o peso baixado."""
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
with sync_playwright() as p:
    br = p.chromium.launch(); ctx = br.new_context(viewport={"width": 430, "height": 932})
    ctx.route("**/vendor/supabase.js", lambda r: r.fulfill(body=FAKE, content_type="application/javascript"))
    pg = ctx.new_page(); cdp = ctx.new_cdp_session(pg)
    cdp.send("Network.enable")
    cdp.send("Network.emulateNetworkConditions", {"offline": False, "latency": 400, "downloadThroughput": 400 * 1024 / 8, "uploadThroughput": 400 * 1024 / 8})
    cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
    got = []
    pg.on("response", lambda r: got.append(r.url))
    import time
    for rodada in ("1ª visita (sem cache)", "2ª visita (com cache)"):
        got.clear(); t0 = time.time()
        pg.goto(f"http://127.0.0.1:{PORT}/", wait_until="commit")
        pg.wait_for_selector(".sk", timeout=60000); t_sk = time.time() - t0
        pg.wait_for_selector(".kpi b", timeout=60000); t_app = time.time() - t0
        libs = [u.split("/")[-1] for u in got if "html2canvas" in u or "jspdf" in u or "qrcode" in u]
        print(f"{rodada}: esqueleto em {t_sk:.1f}s · painel pronto em {t_app:.1f}s · {len(got)} arquivos · bibliotecas de PDF carregadas: {libs or 'nenhuma (só quando gerar)'}")
    t0 = time.time(); pg.evaluate("location.hash='#/proposta/nova'"); pg.wait_for_selector("#page .pg-head", timeout=60000)
    print(f"Abrir o editor de proposta: {time.time()-t0:.1f}s")
    br.close()
srv.shutdown()
