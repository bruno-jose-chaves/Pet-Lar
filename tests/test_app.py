"""Teste ponta a ponta do painel Pet Lar (v1) com banco simulado.
Uso: python tests/test_app.py [webkit|chromium]
Sobe um servidor local da pasta public/ e troca /vendor/supabase.js pelo tests/fake-supabase.js.
"""
import sys, os, json, threading, functools, http.server, socketserver, pathlib, time
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUB = ROOT / "public"; OUT = ROOT / "tests" / "output"; OUT.mkdir(exist_ok=True)
FAKE = (ROOT / "tests" / "fake-supabase.js").read_text()
import socket
_s = socket.socket(); _s.bind(("127.0.0.1", 0)); PORT = _s.getsockname()[1]; _s.close()
socketserver.ThreadingTCPServer.allow_reuse_address = True
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(PUB))
class Quiet(handler.func):
    def log_message(self, *a): pass
srv = socketserver.ThreadingTCPServer(("127.0.0.1", PORT), functools.partial(Quiet, directory=str(PUB)))
srv.daemon_threads = True
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{PORT}/"

results = []
def check(name, cond, extra=""):
    results.append((bool(cond), name)); print(("OK  " if cond else "ERR ") + name + (f"  [{extra}]" if extra else ""), flush=True)

engine = sys.argv[1] if len(sys.argv) > 1 else "webkit"
with sync_playwright() as p:
    br = getattr(p, engine).launch()
    opts = dict(viewport={"width": 430, "height": 932}, device_scale_factor=3, has_touch=True, locale="pt-BR", accept_downloads=True)
    if engine == "webkit": opts.update(is_mobile=True, user_agent=p.devices["iPhone 15 Pro Max"]["user_agent"])
    ctx = br.new_context(**opts)
    ctx.route("**/vendor/supabase.js", lambda r: r.fulfill(body=FAKE, content_type="application/javascript"))
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" else None)
    tap = (lambda sel: pg.tap(sel)) if engine == "webkit" else (lambda sel: pg.click(sel))
    DB = lambda js: pg.evaluate(f"() => {{ const T = window.__FAKE_DB; return {js}; }}")
    def go(h):
        pg.evaluate(f"location.hash = '{h}'"); pg.wait_for_timeout(700)
    def no_hscroll(name):
        sw = pg.evaluate("document.documentElement.scrollWidth"); check(f"{name}: sem rolagem lateral", sw <= 431, f"{sw}px")

    pg.goto(URL); pg.wait_for_timeout(1500)
    # ---------- Hoje ----------
    check("abre logado na tela Hoje", pg.locator("h1.pg").inner_text().strip().endswith("🐾"))
    check("4 indicadores no topo", pg.locator(".kpi").count() == 4)
    check("menu de baixo visível no celular", pg.is_visible(".bottomnav"))
    no_hscroll("Hoje")
    pg.screenshot(path=str(OUT / "app_hoje.png"))

    # ---------- Configurações: Pix ----------
    go("#/config")
    pg.fill("[name=pix_chave]", "(47) 99917-9091"); pg.wait_for_timeout(900)
    check("Config: QR de teste aparece ao digitar a chave", pg.locator("#pixTeste img").count() == 1)
    pg.click("#fS button[type=submit]"); pg.wait_for_timeout(400)
    check("Config: chave Pix salva", DB("T.settings[0].pix_chave") == "(47) 99917-9091")
    pg.fill("#fA [name=nome]", "Larissa"); pg.fill("#fA [name=email]", "Larissa@Exemplo.com"); pg.click("#fA button[type=submit]"); pg.wait_for_timeout(500)
    check("Config: acesso da Larissa liberado (e-mail em minúsculas)", DB("T.admins.some(a=>a.email==='larissa@exemplo.com')"))
    no_hscroll("Config")

    # ---------- Nova proposta ----------
    go("#/proposta/nova"); pg.wait_for_timeout(500)
    check("Proposta: abre o editor", pg.is_visible("#pEnviar") and pg.locator("#page .pg-head").count() == 1)
    check("Proposta: menu de baixo some no editor (tela cheia)", not pg.is_visible(".bottomnav"))
    pg.fill("[data-k=tutor]", "Sabrina Teste"); pg.fill("[data-k=tutorWhats]", "(47) 98888-7777")
    pg.fill("#petList [data-pk=nome]", "Bento"); pg.fill("#petList [data-pk=raca]", "SRD"); pg.select_option("#petList [data-pk=porte]", "M")
    with pg.expect_file_chooser() as fc: tap("#petList .ph")
    fc.value.set_files(str(ROOT / "tests" / "foto_teste.jpg")); pg.wait_for_timeout(500)
    check("Proposta: botões de foto pequenos", pg.locator("#petList .photo-actions .btn.mini").first.bounding_box()["height"] <= 34)
    tap("[data-chips=servico] .chip[data-v=hosp]")
    hoje = pg.evaluate("new Date().toISOString().slice(0,10)")
    dois = pg.evaluate("(()=>{const d=new Date();d.setDate(d.getDate()+2);return d.toISOString().slice(0,10)})()")
    pg.fill("[data-k=h_in]", hoje); pg.fill("[data-k=h_out]", dois)
    check("Proposta: 3 dias de hospedagem = R$ 300", pg.inner_text("#calcTot") == "R$ 300", pg.inner_text("#calcTot"))
    pg.wait_for_timeout(2600)
    check("Proposta: salvou sozinha e ganhou número", pg.inner_text("#pNum").startswith("PL-"), pg.inner_text("#pNum"))
    check("Proposta: endereço mudou para a proposta salva", "/proposta/" in pg.evaluate("location.hash") and "nova" not in pg.evaluate("location.hash"))
    check("Banco: tutor criado com WhatsApp", DB("T.tutores.length===1 && T.tutores[0].whatsapp==='(47) 98888-7777'"))
    check("Banco: pet criado e vinculado ao tutor, com foto", DB("T.pets.length===1 && T.pets[0].tutor_id===T.tutores[0].id && !!T.pets[0].foto_path && !!window.__FAKE_STORE[T.pets[0].foto_path]"))
    check("Banco: proposta com valor, período e pet", DB("T.propostas.length===1 && T.propostas[0].valor_total===300 && T.propostas[0].data_fim && T.proposta_pets.length===1"))
    check("Banco: foto não vai dentro do payload (fica no armazenamento)", DB("!JSON.stringify(T.propostas[0].payload).includes('data:image')"))
    check("PDF: mostra o número e o QR Pix do sinal", pg.locator("#page .pg-meta").inner_text().find("PL-") >= 0 and pg.locator("#page .cond img").count() == 1)
    no_hscroll("Editor de proposta")
    pg.screenshot(path=str(OUT / "app_proposta.png"))

    # Enviar: mensagem com Pix
    tap("#btnEnviar2"); pg.wait_for_timeout(400)
    msg = pg.locator(".modal pre").inner_text()
    check("Enviar: mensagem com valor, sinal e Pix copia e cola", "R$ 300" in msg and "R$ 150" in msg and "br.gov.bcb.pix" in msg, msg[:60])
    check("Enviar: botão do WhatsApp aponta para o número do tutor", "wa.me/5547988887777" in pg.get_attribute(".modal [data-a=wa]", "href"))
    with pg.expect_download(timeout=60000) as d: pg.click(".modal [data-a=pdf]")
    d.value.save_as(str(OUT / "proposta.pdf")); sz = os.path.getsize(OUT / "proposta.pdf")
    check("Enviar: PDF gerado", sz > 200_000, f"{sz//1024} KB")
    pg.wait_for_timeout(600)
    check("Status virou “Enviada” depois de compartilhar", DB("T.propostas[0].status") == "enviada")
    with pg.expect_download(timeout=60000) as d: pg.click(".modal [data-a=card]")
    d.value.save_as(str(OUT / "card.png")); check("Enviar: imagem (card) gerada", os.path.getsize(OUT / "card.png") > 50_000)
    pg.click(".modal [data-close]"); pg.wait_for_timeout(300)

    # Aceitar
    tap("#pMenu"); pg.wait_for_timeout(300); pg.click(".modal [data-st=aceita]"); pg.wait_for_timeout(900)
    check("Aceitar: status aceita", DB("T.propostas[0].status") == "aceita")
    check("Aceitar: sinal e saldo lançados (150 + 150)", DB("T.pagamentos.map(g=>g.valor).sort().join()") == "150,150")
    check("Aceitar: pagamentos aparecem no editor", pg.locator("#pagtosBox [data-pg]").count() == 2)

    # Regras de preço no editor (núcleo do gerador)
    casos = [({"servico": "pacote", "p_plano": "outro", "p_outro": "10"}, 2250), ({"servico": "visitas", "v_ini": "2026-11-20", "v_fim": "2026-11-22", "v_dia": "2"}, 335), ({"servico": "banho", "b_plano": "quinzenal"}, 215)]
    for st, exp in casos:
        got = pg.evaluate("""(st)=>{ const S=Object.assign(G.blank(),st); S.pets=[Object.assign(G.newPet(),{nome:'X',porte:'M'})]; const old=G.S; G.S=S; const r=G.calc().final; G.S=old; return r; }""", st)
        check(f"Preço {st.get('servico')} = R$ {exp}", got == exp, got)

    # ---------- Nav guard: editar e sair rápido salva antes ----------
    pg.fill("[data-k=obs]", "Recado de teste antes de sair")
    go("#/propostas"); pg.wait_for_timeout(1200)
    check("Sair do editor com alteração pendente salva antes", DB("T.propostas[0].payload.obs") == "Recado de teste antes de sair")

    # ---------- Lista de propostas ----------
    check("Lista: proposta aparece", pg.locator("#lista .item").count() == 1)
    tap("#fil .chip[data-v=recusada]"); pg.wait_for_timeout(500)
    check("Lista: filtro Recusadas vazio", pg.locator("#lista .item").count() == 0)
    tap("#fil .chip[data-v='']"); pg.fill("#q", "sabr"); pg.wait_for_timeout(700)
    check("Lista: busca por tutor", pg.locator("#lista .item").count() == 1)
    check("Lista: funil com taxa de aceite", "100%" in pg.inner_text("#funil"))
    no_hscroll("Propostas")

    # ---------- Duplicar ----------
    pid = DB("T.propostas[0].id")
    go(f"#/proposta/{pid}"); pg.wait_for_timeout(800)
    check("Reabrir: foto do pet volta do armazenamento", pg.locator("#petList .ph img").count() == 1)
    tap("#pMenu"); pg.wait_for_timeout(300); pg.click(".modal [data-dup]"); pg.wait_for_timeout(3200)
    check("Duplicar: cria a proposta 002 com o mesmo pet", DB("T.propostas.length===2 && T.propostas[1].numero.endsWith('-002') && T.proposta_pets.filter(x=>x.proposta_id===T.propostas[1].id).length===1"))
    check("Duplicar: não cria pet repetido", DB("T.pets.length") == 1)
    tap("#pMenu"); pg.wait_for_timeout(300); pg.click(".modal [data-del]"); pg.wait_for_timeout(300); pg.click(".modal [data-ok]"); pg.wait_for_timeout(700)
    check("Excluir: proposta duplicada apagada", DB("T.propostas.length") == 1 and "#/propostas" in pg.evaluate("location.hash"))

    # ---------- Tutor ----------
    tid = DB("T.tutores[0].id")
    go(f"#/tutor/{tid}")
    check("Tutor: mostra pet e proposta", pg.locator(".item[href^='#/pet/']").count() == 1 and pg.locator(".item[href^='#/proposta/']").count() == 1)
    check("Tutor: já contratou R$ 300", "R$ 300" in pg.inner_text(".kpis"))
    n_antes = DB("T.propostas.length")
    tap("#bNovaProp"); pg.wait_for_timeout(1500)
    check("Nova proposta pelo tutor: tutor e pet já preenchidos", pg.input_value("[data-k=tutor]") == "Sabrina Teste" and pg.input_value("#petList [data-pk=nome]") == "Bento")
    go("#/hoje"); pg.wait_for_timeout(600)
    check("Abrir e sair sem mexer não cria rascunho", DB("T.propostas.length") == n_antes)

    # ---------- Hoje / Pets / Agenda ----------
    check("Hoje: Bento aparece hospedado", "Bento" in pg.inner_text("#hoje"))
    go("#/pets"); tap("#abas .chip[data-v=ativos]"); pg.wait_for_timeout(600)
    check("Pets: Bento em “Com a Lari agora”", "Bento" in pg.inner_text("#lista"))
    tap("#abas .chip[data-v=todos]"); pg.wait_for_timeout(600)
    check("Pets: aba Todos com busca", pg.is_visible("#q") and pg.locator("#lista .item").count() == 1)
    no_hscroll("Pets")
    pg.evaluate("""() => { const T=window.__FAKE_DB; const h=new Date().toISOString().slice(0,10);
      for (let i=0;i<3;i++){ const id='x'+i; T.propostas.push({id,numero:'PL-T-'+i,status:'aceita',servico:'hosp',tutor_nome:'Outro '+i,data_inicio:h,data_fim:h,valor_total:100,valor_cheio:100,payload:{},created_at:new Date().toISOString()}); } }""")
    go("#/agenda"); pg.wait_for_timeout(700)
    check("Agenda: alerta de lotação (4 hóspedes > capacidade 3)", "capacidade" in pg.inner_text("#alerta"))
    check("Agenda: dia de hoje lista os serviços", pg.locator("#selL .item").count() == 4)
    no_hscroll("Agenda")
    pg.screenshot(path=str(OUT / "app_agenda.png"))
    pg.evaluate("() => { const T=window.__FAKE_DB; T.propostas = T.propostas.filter(p=>!String(p.id).startsWith('x')); }")

    # ---------- Financeiro ----------
    go("#/financeiro"); pg.wait_for_timeout(700)
    check("Financeiro: R$ 300 a receber", "R$ 300" in pg.inner_text("#kpis"))
    pg.locator("[data-pagar]").first.click(); pg.wait_for_timeout(300); pg.click(".modal [data-f=pix]"); pg.wait_for_timeout(800)
    check("Financeiro: sinal recebido via Pix", DB("T.pagamentos.filter(g=>g.pago_em&&g.forma==='pix').length") == 1)
    check("Financeiro: recebido no mês R$ 150", "R$ 150" in pg.inner_text("#kpis"))
    no_hscroll("Financeiro")

    # ---------- Ficha do pet ----------
    petid = DB("T.pets[0].id")
    go(f"#/pet/{petid}"); pg.wait_for_timeout(700)
    pg.fill("[name=alimentacao]", "Golden 150g 2x ao dia"); pg.click("#fPet button[type=submit]"); pg.wait_for_timeout(500)
    check("Pet: ficha salva", DB("T.pets[0].alimentacao") == "Golden 150g 2x ao dia")
    check("Pet: botões de foto pequenos", pg.locator("#bFoto").bounding_box()["height"] <= 34)
    tap("#bRmFoto"); pg.wait_for_timeout(700)
    check("Pet: remover foto", DB("T.pets[0].foto_path") is None)
    no_hscroll("Ficha do pet")

    # ---------- v1.1: valor combinado ----------
    go(f"#/proposta/{pid}"); pg.wait_for_timeout(900)
    pg.fill("[data-k=valorFechado]", "250"); pg.wait_for_timeout(2400)
    check("Valor combinado: total vira R$ 250", pg.inner_text("#calcTot") == "R$ 250", pg.inner_text("#calcTot"))
    check("Valor combinado: mostra a conta da tabela (R$ 300)", "R$ 300" in pg.inner_text("#valorTabela"))
    check("Valor combinado: PDF mostra a condição especial", "Condição especial combinada" in pg.inner_text("#page"))
    check("Valor combinado: salvo no banco", DB("T.propostas[0].valor_total") == 250)
    pg.fill("[data-k=valorFechado]", ""); pg.wait_for_timeout(2400)
    check("Valor combinado vazio: volta para a tabela", DB("T.propostas[0].valor_total") == 300)

    # ---------- v1.1: orçamento importado (sem datas) ----------
    pg.evaluate("""() => { const T=window.__FAKE_DB; T.tutores.push({id:'tImp',nome:'Louise',whatsapp:null,created_at:new Date().toISOString()});
      T.pets.push({id:'pImp',tutor_id:'tImp',nome:'Benedita',especie:'cao',raca:'Dachshund',idade:'3 anos',porte:'P',passeia:true,ativo:true,reativo:false,foto_path:null});
      T.propostas.push({id:'imp1',numero:'PL-2026-090',ano:2026,seq:90,status:'enviada',servico:'hosp',tutor_id:'tImp',tutor_nome:'Louise',data_inicio:null,data_fim:null,valor_total:680,valor_cheio:1000,
        payload:{tutor:'Louise',servico:'hosp',cidade:'BC',tutor_id:'tImp',valorFechado:'680',obs:'importado',pets:[{id:'a1',pet_id:'pImp',nome:'Benedita',especie:'cao',raca:'Dachshund',idade:'3 anos',porte:'P',passeia:true}],importada:{quando:'Pet Sister, jul–out/2026',nota:'Datas não registradas.'}},
        created_at:new Date(Date.now()-86400000).toISOString()});
      T.proposta_pets.push({proposta_id:'imp1',pet_id:'pImp'}); }""")
    go("#/proposta/imp1"); pg.wait_for_timeout(900)
    check("Importado: aviso de orçamento do histórico", "importado do histórico" in pg.inner_text("#impBanner"))
    check("Importado: valor combinado carregado", pg.input_value("[data-k=valorFechado]") == "680")
    pg.fill("[data-k=obs]", "completando depois"); pg.wait_for_timeout(2400)
    check("Importado: editar sem datas não zera o valor", DB("T.propostas.find(p=>p.id==='imp1').valor_total") == 680)
    go("#/tutor/tImp"); pg.wait_for_timeout(700)
    check("Tutor: seção Histórico de orçamentos", "Histórico de orçamentos" in pg.inner_text("#view") and pg.locator(".item.hist").count() == 1)
    go("#/propostas"); tap("#fil .chip[data-v=cliente]"); pg.wait_for_timeout(700)
    check("Propostas por cliente: 2 clientes", pg.locator("#lista .item").count() == 2, pg.locator("#lista .item").count())
    check("Propostas por cliente: mostra quanto contratou", "contratado" in pg.inner_text("#lista"))
    tap("#fil .chip[data-v='']"); pg.wait_for_timeout(500)
    pg.evaluate("() => { const T=window.__FAKE_DB; T.propostas=T.propostas.filter(p=>p.id!=='imp1'); T.proposta_pets=T.proposta_pets.filter(x=>x.proposta_id!=='imp1'); T.pets=T.pets.filter(p=>p.id!=='pImp'); T.tutores=T.tutores.filter(t=>t.id!=='tImp'); }")

    # ---------- v1.1: níveis de acesso (admin) e manual ----------
    go("#/config"); pg.wait_for_timeout(700)
    check("Config (admin): escolhe o nível de cada pessoa", pg.locator("#adm select[data-papel]").count() == 2)
    pg.select_option("#adm select[data-papel='larissa@exemplo.com']", "assistente"); pg.wait_for_timeout(600)
    check("Config (admin): nível da Larissa alterado", DB("T.admins.find(a=>a.email==='larissa@exemplo.com').papel") == "assistente")
    pg.select_option("#adm select[data-papel='larissa@exemplo.com']", "gestora"); pg.wait_for_timeout(500)
    go("#/ajuda"); pg.wait_for_timeout(900)
    check("Manual: abre dentro do painel", "Manual do painel" in pg.inner_text(".manual h1") and pg.locator(".manual table").count() >= 4)
    y0 = pg.evaluate("scrollY"); pg.click(".manual a[data-ancora=niveis-de-acesso]"); pg.wait_for_timeout(900)
    check("Manual: link do sumário rola até a seção (sem trocar de tela)", pg.evaluate("scrollY") > y0 and pg.evaluate("location.hash") == "#/ajuda")
    no_hscroll("Manual")

    # ---------- Falha de rede ao salvar ----------
    go(f"#/proposta/{pid}"); pg.wait_for_timeout(800)
    pg.evaluate("() => { window.__FAKE_FAIL = q => q.t==='propostas' && q.op==='update'; }")
    pg.fill("[data-k=obs]", "vai falhar"); pg.wait_for_timeout(2200)
    check("Erro ao salvar aparece para o usuário", "Erro" in pg.inner_text("#saveState"))
    pg.evaluate("() => { window.__FAKE_FAIL = null; }"); pg.fill("[data-k=obs]", "voltou a internet"); pg.wait_for_timeout(2200)
    check("Depois da falha, salva normalmente", DB("T.propostas[0].payload.obs") == "voltou a internet")

    # ---------- Sair e login ----------
    go("#/config"); pg.click("#bSair"); pg.wait_for_timeout(700)
    check("Sair leva para o login", pg.is_visible("#fLogin"))
    pg.fill("#fLogin [name=email]", "teste@petlar.app"); pg.fill("#fLogin [name=senha]", "errada"); pg.click("#fLogin button[type=submit]"); pg.wait_for_timeout(500)
    check("Login: senha errada mostra aviso", "incorretos" in pg.inner_text("#fLogin"))
    pg.fill("#fLogin [name=email]", "teste@petlar.app"); pg.fill("#fLogin [name=senha]", "senha123"); pg.click("#fLogin button[type=submit]"); pg.wait_for_timeout(1200)
    check("Login: entra no painel", pg.is_visible(".appbar") and pg.locator(".kpi").count() == 4)
    pg.screenshot(path=str(OUT / "app_hoje_final.png"))

    # ---------- v1.1: assistente e gestora (outra sessão) ----------
    def sessao(papel):
        c = br.new_context(**opts); c.route("**/vendor/supabase.js", lambda r: r.fulfill(body=FAKE, content_type="application/javascript"))
        c.add_init_script(f"window.__FAKE_PAPEL = '{papel}';")
        q = c.new_page(); q.on("pageerror", lambda e: errs.append(papel + ": " + str(e))); q.goto(URL); q.wait_for_timeout(1500); return c, q
    c2, q = sessao("assistente")
    q.evaluate("""() => { const T=window.__FAKE_DB; const h=new Date().toISOString().slice(0,10);
      T.tutores.push({id:'tA',nome:'Milena',whatsapp:'(47) 90000-0000',endereco:'Rua 1',bairro:'Centro',cidade:'BC'});
      T.pets.push({id:'pA',tutor_id:'tA',nome:'Duque',especie:'cao',raca:'Shih Tzu',porte:'P',passeia:true,ativo:true,reativo:false,medicacao:'Vermífugo dia 25'});
      T.propostas.push({id:'sA',numero:'PL-2026-050',status:'aceita',servico:'hosp',tutor_id:'tA',tutor_nome:'Milena',data_inicio:h,data_fim:h,valor_total:540,valor_cheio:540,payload:{obs:'Leva a caminha dele'},created_at:new Date().toISOString()});
      T.proposta_pets.push({proposta_id:'sA',pet_id:'pA'}); }""")
    q.evaluate("location.hash='#/agenda'"); q.wait_for_timeout(300); q.evaluate("location.hash='#/hoje'"); q.wait_for_timeout(900)
    check("Assistente: menu sem Propostas e sem Financeiro", q.locator(".bottomnav [data-nav=propostas]").count() == 0 and q.locator(".topnav [data-nav=financeiro]").count() == 0)
    check("Assistente: Hoje sem valores em R$", q.locator(".kpi").count() == 2 and "R$" not in q.inner_text("#view"))
    check("Assistente: sem botão de nova proposta", q.locator(".fab").count() == 0)
    q.evaluate("location.hash='#/financeiro'"); q.wait_for_timeout(700)
    check("Assistente: Financeiro bloqueado (volta para Hoje)", q.evaluate("location.hash") == "#/hoje")
    q.evaluate("location.hash='#/proposta/sA'"); q.wait_for_timeout(900)
    t = q.inner_text("#view")
    check("Assistente: serviço abre sem valores, com cuidados e recado", "Duque" in t and "Vermífugo" in t and "caminha" in t and "R$" not in t)
    q.evaluate("location.hash='#/config'"); q.wait_for_timeout(700)
    check("Assistente: Configurações só mostra o próprio acesso", q.locator("#fS").count() == 0 and q.locator("#fA").count() == 0 and "Assistente" in q.inner_text("#view"))
    q.screenshot(path=str(OUT / "app_assistente.png")); c2.close()
    c3, q = sessao("gestora")
    q.evaluate("location.hash='#/config'"); q.wait_for_timeout(900)
    check("Gestora: edita Pix e configurações, mas não acessos", q.locator("#fS").count() == 1 and q.locator("#fA").count() == 0)
    check("Gestora: vê Propostas e Financeiro", q.locator(".topnav [data-nav=propostas]").count() == 1 and q.locator(".topnav [data-nav=financeiro]").count() == 1)
    c3.close()

    real_errs = [e for e in errs if "falha simulada" not in e and "Failed to load resource" not in e]
    check("Sem erros de JavaScript", not real_errs, " | ".join(real_errs)[:300])
    br.close()
srv.shutdown()
bad = [r for r in results if not r[0]]
print(f"\n{len(results)-len(bad)}/{len(results)} ok ({engine})")
sys.exit(1 if bad else 0)
