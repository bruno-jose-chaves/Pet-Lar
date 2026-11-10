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
    pg.wait_for_timeout(3400)
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
    pg.fill("[data-k=valorFechado]", "250"); pg.wait_for_timeout(3200)
    check("Valor combinado: total vira R$ 250", pg.inner_text("#calcTot") == "R$ 250", pg.inner_text("#calcTot"))
    check("Valor combinado: mostra a conta da tabela (R$ 300)", "R$ 300" in pg.inner_text("#valorTabela"))
    check("Valor combinado: PDF mostra a condição especial", "Condição especial combinada" in pg.inner_text("#page"))
    check("Valor combinado: salvo no banco", DB("T.propostas[0].valor_total") == 250)
    pg.fill("[data-k=valorFechado]", ""); pg.wait_for_timeout(3200)
    check("Valor combinado vazio: volta para a tabela", DB("T.propostas[0].valor_total") == 300)

    # ---------- v1.6: nome do tutor não salva pela metade ----------
    n_tut = DB("T.tutores.length")
    go("#/proposta/nova"); pg.wait_for_timeout(600)
    pg.click("[data-k=tutor]"); pg.keyboard.type("Car", delay=60); pg.wait_for_timeout(3500)
    check("Tutor: pausa no meio do nome não cria cliente pela metade", DB("T.tutores.length") == n_tut and DB("!T.tutores.some(t=>t.nome==='Car')"))
    pg.keyboard.type("olina Duarte", delay=40); pg.click("#petList [data-pk=nome]"); pg.keyboard.type("Mel", delay=40); pg.wait_for_timeout(3800)
    check("Tutor: ao sair do campo, cria um cliente só, com o nome inteiro", DB("T.tutores.length") == n_tut + 1 and DB("T.tutores.some(t=>t.nome==='Carolina Duarte')"))
    pg.click("[data-k=tutor]"); pg.keyboard.press("End"); pg.keyboard.type(" Silva", delay=40); pg.click("[data-k=obs]"); pg.wait_for_timeout(3800)
    check("Tutor: corrigir o nome atualiza o mesmo cliente (sem duplicar)", DB("T.tutores.length") == n_tut + 1 and DB("T.tutores.some(t=>t.nome==='Carolina Duarte Silva')"))
    nid = pg.evaluate("G.META.id")
    pg.evaluate(f"() => {{ const T=window.__FAKE_DB; const p=T.propostas.find(x=>x.id==='{nid}'); const tid=p.tutor_id; T.propostas=T.propostas.filter(x=>x.id!=='{nid}'); T.proposta_pets=T.proposta_pets.filter(x=>x.proposta_id!=='{nid}'); T.pets=T.pets.filter(x=>x.tutor_id!==tid); T.tutores=T.tutores.filter(t=>t.id!==tid); }}")
    go("#/propostas"); pg.wait_for_timeout(500)

    # ---------- v1.2: duas opções na mesma proposta ----------
    go(f"#/proposta/{pid}"); pg.wait_for_timeout(900)
    tap("#optTabs [data-opt=add]"); pg.wait_for_timeout(400)
    check("2 opções: cria a opção 2 e passa a editá-la", DB("true") and pg.evaluate("G.S.editando") == 2 and pg.locator("#optTabs .chip").count() == 2)
    tap("[data-chips=servico] .chip[data-v=visitas]")
    pg.fill("[data-k=v_ini]", hoje); pg.fill("[data-k=v_fim]", dois); pg.select_option("[data-k=v_dia]", "1"); pg.wait_for_timeout(300)
    check("2 opções: opção 2 = 3 visitas R$ 210", pg.inner_text("#calcTot") == "R$ 210", pg.inner_text("#calcTot"))
    check("2 opções: PDF mostra as duas, a 1 recomendada", pg.locator("#page .opt").count() == 2 and "recomendada" in pg.locator("#page .opt.rec").inner_text().lower() and "hospedagem" in pg.locator("#page .opt.rec").inner_text().lower())
    check("2 opções: PDF sem QR do Pix até o cliente escolher", pg.locator("#page .cond img").count() == 0 and "escolher a opção" in pg.inner_text("#page .cond"))
    pg.wait_for_timeout(3200)
    check("2 opções: banco guarda a recomendada (R$ 300, hospedagem) e a outra no payload", DB("T.propostas[0].valor_total===300 && T.propostas[0].servico==='hosp' && T.propostas[0].payload.alt.servico==='hosp' && T.propostas[0].payload.servico==='visitas'"))
    check("2 opções: resumo da lista cita a opção 2", "ou opção 2" in DB("T.propostas[0].resumo"))
    tap("#optTabs [data-opt=rec]"); pg.wait_for_timeout(3400)
    check("2 opções: recomendar a 2 muda o destaque e o valor salvo", "Visitas" in pg.locator("#page .opt.rec").inner_text() and DB("T.propostas[0].valor_total") == 210 and DB("T.propostas[0].servico") == "visitas")
    tap("#optTabs .chip[data-opt='1']"); pg.wait_for_timeout(400)
    check("2 opções: voltar para a opção 1 mantém a hospedagem", pg.evaluate("G.S.servico") == "hosp" and pg.inner_text("#calcTot") == "R$ 300")
    tap("#pEnviar"); pg.wait_for_timeout(500); msg2 = pg.inner_text(".modal pre")
    check("2 opções: mensagem lista as duas e pede a escolha", "duas opções" in msg2 and "Opção 2 (recomendada)" in msg2 and "R$ 300" in msg2 and "qual opção" in msg2 and "br.gov.bcb.pix" not in msg2, msg2[:80])
    pg.click(".modal [data-close]"); pg.wait_for_timeout(300)
    # duplicar para testar o aceite de uma opção
    tap("#pMenu"); pg.wait_for_timeout(300); pg.click(".modal [data-dup]"); pg.wait_for_timeout(3200)
    dup = pg.evaluate("G.META.id")
    tap("#pMenu"); pg.wait_for_timeout(300)
    check("2 opções: menu oferece aceitar a opção 1 ou a 2", pg.locator(".modal [data-esc]").count() == 2)
    pg.click(".modal [data-esc='1']"); pg.wait_for_timeout(1500)
    check("2 opções: aceitou a opção 1 → aceita com R$ 300 e sinal de R$ 150", DB(f"(()=>{{const p=T.propostas.find(x=>x.id==='{dup}'); return p.status==='aceita' && p.valor_total===300 && p.payload.escolhida===1 && T.pagamentos.filter(g=>g.proposta_id===p.id).map(g=>g.valor).join()==='150,150'}})()"))
    check("2 opções: PDF marca a opção escolhida e volta o QR do Pix", "escolhida" in pg.locator("#page .opt.rec").inner_text().lower() and pg.locator("#page .cond img").count() == 1)
    tap("#pMenu"); pg.wait_for_timeout(300); pg.click(".modal [data-del]"); pg.wait_for_timeout(300); pg.click(".modal [data-ok]"); pg.wait_for_timeout(800)
    pg.evaluate(f"() => {{ const T=window.__FAKE_DB; T.pagamentos=T.pagamentos.filter(g=>g.proposta_id!=='{dup}'); }}")
    go(f"#/proposta/{pid}"); pg.wait_for_timeout(900)
    tap("#optTabs .chip[data-opt='2']"); pg.wait_for_timeout(300); tap("#optTabs [data-opt=rm]"); pg.wait_for_timeout(300); pg.click(".modal [data-ok]"); pg.wait_for_timeout(3400)
    check("2 opções: remover a opção 2 volta a ser proposta simples de hospedagem R$ 300", DB("!T.propostas[0].payload.alt && T.propostas[0].valor_total===300 && T.propostas[0].servico==='hosp'") and pg.locator("#page .opts").count() == 0)
    no_hscroll("Editor com 2 opções")

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
    pg.fill("[data-k=obs]", "completando depois"); pg.wait_for_timeout(3200)
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

    # ---------- v1.3: Cobrar resposta e ações rápidas ----------
    pg.evaluate("""() => { const T=window.__FAKE_DB; const d=n=>new Date(Date.now()-n*86400000).toISOString(); const amanha=new Date(Date.now()+3*86400000).toISOString().slice(0,10);
      T.tutores.push({id:'tc',nome:'Carla Souza',whatsapp:'(47) 97777-1111'});
      T.pets.push({id:'pc',tutor_id:'tc',nome:'Nina',especie:'cao',porte:'P',passeia:true,ativo:true,reativo:false});
      const base={servico:'hosp',tutor_id:'tc',tutor_nome:'Carla Souza',valor_total:500,valor_cheio:500,payload:{},cobrancas:0,data_inicio:'2026-12-20',data_fim:'2026-12-24'};
      [['c1',5,null],['c2',0,null],['c3',20,null],['c4',6,null],['c5',4,amanha]].forEach(([id,dd,lem],i)=>{ T.propostas.push(Object.assign({},base,{id,numero:'PL-T-0'+i,status:'enviada',enviada_em:d(dd),created_at:d(dd),lembrar_em:lem})); T.proposta_pets.push({proposta_id:id,pet_id:'pc'}); });
      const c4=T.propostas.find(p=>p.id==='c4'); c4.payload={alt:{servico:'visitas'},escolhida:null,opcoes:[{n:1,servico:'hosp',titulo:'Hospedagem no Pet Lar',valor_total:500,valor_cheio:500,data_inicio:'2026-12-20',data_fim:'2026-12-24'},{n:2,servico:'visitas',titulo:'Pet Sitter · Visitas em casa',valor_total:350,valor_cheio:380,data_inicio:'2026-12-20',data_fim:'2026-12-24'}]}; }""")
    go("#/cobrar"); pg.wait_for_timeout(1000)
    txt = pg.inner_text("#cb")
    check("Cobrar: separa cobrar agora (2), recentes, adiadas e antigas", pg.locator(".kpi").first.inner_text().split("\n")[1] == "2" and "Adiadas" in txt and "mais de 15 dias" in txt, pg.locator(".kpi").first.inner_text().replace("\n"," "))
    link = pg.locator(".pwrap[data-pid=c1] [data-qa=cobrar]")
    href = link.get_attribute("href")
    check("Cobrar: WhatsApp do tutor com mensagem pronta (1ª cobrança)", "wa.me/5547977771111" in href and "Nina" in __import__("urllib.parse").parse.unquote(href))
    with ctx.expect_page() as popup: link.click()
    popup.value.close(); pg.wait_for_timeout(800)
    check("Cobrar: cobrança registrada (1×) e lembrete marcado", DB("(()=>{const p=T.propostas.find(x=>x.id==='c1'); return p.cobrancas===1 && !!p.cobrada_em && !!p.lembrar_em})()"))
    check("Cobrar: depois de cobrar sai de 'Cobrar agora'", pg.locator(".kpi").first.inner_text().split("\n")[1] == "1")
    check("Cobrar: segunda cobrança muda o tom da mensagem", "procuradas" in pg.evaluate("""() => decodeURIComponent(document.querySelector('.pwrap[data-pid=c1] [data-qa=cobrar]').href)"""))
    pg.click(".pwrap[data-pid=c4] [data-qa=adiar]"); pg.wait_for_timeout(300); pg.click(".modal [data-d='7']"); pg.wait_for_timeout(700)
    check("Cobrar: adiar 1 semana grava o lembrete", DB("T.propostas.find(x=>x.id==='c4').lembrar_em") == pg.evaluate("(()=>{const d=new Date();d.setDate(d.getDate()+7);return d.toISOString().slice(0,10)})()"))
    pg.click("#bExpirar"); pg.wait_for_timeout(300); pg.click(".modal [data-ok]"); pg.wait_for_timeout(700)
    check("Cobrar: antigas marcadas como sem resposta", DB("T.propostas.find(x=>x.id==='c3').status") == "expirada")
    pg.wait_for_timeout(300)
    no_hscroll("Cobrar")
    pg.screenshot(path=str(OUT / "app_cobrar.png"))
    # Propostas: ações direto da lista
    go("#/propostas"); tap("#fil .chip[data-v=enviada]"); pg.wait_for_timeout(800)
    check("Lista: linhas enviadas têm Aceitou/Recusou/Cobrar", pg.locator(".pwrap[data-pid=c2] [data-qa=aceita]").count() == 1 and pg.locator(".pwrap[data-pid=c2] [data-qa=cobrar]").count() == 1)
    pg.click(".pwrap[data-pid=c2] [data-qa=recusada]"); pg.wait_for_timeout(700)
    check("Lista: recusou direto da lista", DB("T.propostas.find(x=>x.id==='c2').status") == "recusada")
    pg.click(".toast.acao button"); pg.wait_for_timeout(700)
    check("Lista: desfazer volta para enviada", DB("T.propostas.find(x=>x.id==='c2').status") == "enviada")
    pg.click(".pwrap[data-pid=c2] [data-qa=aceita]"); pg.wait_for_timeout(300); pg.click(".modal [data-ok]"); pg.wait_for_timeout(900)
    check("Lista: aceitou com confirmação → sinal e saldo lançados", DB("T.propostas.find(x=>x.id==='c2').status==='aceita' && T.pagamentos.filter(g=>g.proposta_id==='c2').length===2"))
    pg.click(".pwrap[data-pid=c4] [data-qa=aceita]"); pg.wait_for_timeout(500)
    check("Lista: proposta de 2 opções pergunta qual foi aceita", pg.locator(".modal [data-n]").count() == 2)
    pg.click(".modal [data-n='2']"); pg.wait_for_timeout(900)
    check("Lista: aceitou a opção 2 → valor, serviço e sinal da opção 2", DB("(()=>{const p=T.propostas.find(x=>x.id==='c4'); return p.status==='aceita' && p.valor_total===350 && p.servico==='visitas' && p.payload.escolhida===2 && T.pagamentos.filter(g=>g.proposta_id==='c4').map(g=>g.valor).join()==='175,175'})()"))
    # seleção em lote
    tap("#fil .chip[data-v='']"); pg.wait_for_timeout(700)
    pg.click("#bSel"); pg.wait_for_timeout(300)
    pg.click(".pwrap[data-pid=c1]"); pg.click(".pwrap[data-pid=c5]"); pg.wait_for_timeout(200)
    check("Lote: conta as selecionadas", "2 selecionadas" in pg.inner_text("#loteN"))
    pg.click("#lote [data-lote=recusada]"); pg.wait_for_timeout(300); pg.click(".modal [data-ok]"); pg.wait_for_timeout(800)
    check("Lote: 2 marcadas como recusadas de uma vez", DB("['c1','c5'].every(id=>T.propostas.find(x=>x.id===id).status==='recusada')") and pg.locator("#lote.hide").count() == 1)
    no_hscroll("Propostas com ações")
    pg.screenshot(path=str(OUT / "app_propostas_acoes.png"))
    go("#/hoje"); pg.wait_for_timeout(900)
    check("Hoje: seção Cobrar resposta com link para a aba", "Cobrar resposta" in pg.inner_text("#view") and pg.locator("a[href='#/cobrar']").count() >= 1)
    check("Menu: Cobrar no menu de baixo", pg.locator(".bottomnav [data-nav=cobrar]").count() == 1)
    pg.evaluate("""() => { const T=window.__FAKE_DB; const ids=['c1','c2','c3','c4','c5']; T.propostas=T.propostas.filter(p=>!ids.includes(p.id)); T.proposta_pets=T.proposta_pets.filter(x=>!ids.includes(x.proposta_id)); T.pagamentos=T.pagamentos.filter(g=>!ids.includes(g.proposta_id)); T.pets=T.pets.filter(p=>p.id!=='pc'); T.tutores=T.tutores.filter(t=>t.id!=='tc'); }""")
    # A-04: link de nova senha
    go("#/config"); pg.wait_for_timeout(800)
    pg.click("#adm [data-senha='larissa@exemplo.com']"); pg.wait_for_timeout(300); pg.click(".modal [data-ok]"); pg.wait_for_timeout(600)
    check("Config: manda link de nova senha para outra pessoa", "Link enviado" in pg.inner_text("body"))

    # ---------- v1.4: filtros ----------
    pg.evaluate("""() => { const T=window.__FAKE_DB; const d=n=>new Date(Date.now()-n*86400000).toISOString();
      T.tutores.push({id:'tf1',nome:'Fábio Lima',whatsapp:'(47) 95555-0000',cidade:'Itajaí',bairro:'Fazenda'},{id:'tf2',nome:'Gabi Rocha',whatsapp:null,cidade:'Balneário Camboriú',bairro:'Centro'});
      T.pets.push({id:'pf1',tutor_id:'tf1',nome:'Thor',especie:'cao',porte:'G',passeia:true,ativo:true,reativo:true,foto_path:null},{id:'pf2',tutor_id:'tf2',nome:'Mia',especie:'gato',porte:'P',passeia:false,ativo:true,reativo:false,medicacao:'Remédio de tireoide',foto_path:null});
      T.propostas.push({id:'f1',numero:'PL-F-1',status:'enviada',servico:'banho',tutor_id:'tf1',tutor_nome:'Fábio Lima',cidade:'Itajaí',valor_total:160,valor_cheio:160,payload:{},created_at:d(40),enviada_em:d(40),data_inicio:null,data_fim:null},
                       {id:'f2',numero:'PL-F-2',status:'aceita',servico:'visitas',tutor_id:'tf2',tutor_nome:'Gabi Rocha',cidade:'Balneário Camboriú',valor_total:1200,valor_cheio:1200,payload:{},created_at:d(1),data_inicio:new Date().toISOString().slice(0,10),data_fim:new Date().toISOString().slice(0,10)});
      T.proposta_pets.push({proposta_id:'f1',pet_id:'pf1'},{proposta_id:'f2',pet_id:'pf2'});
      const h=new Date().toISOString().slice(0,10); T.pagamentos.push({id:'gf1',proposta_id:'f2',descricao:'Sinal (50%)',valor:600,vencimento:h,pago_em:null},{id:'gf2',proposta_id:'f2',descricao:'Saldo (50%)',valor:600,vencimento:h,pago_em:null}); }""")
    go("#/propostas"); tap("#fil .chip[data-v='']"); pg.wait_for_timeout(800)
    n_todas = pg.locator("#lista .pwrap").count()
    def filtrar(fn):
        pg.click("#fbar [data-fabrir]"); pg.wait_for_timeout(300); fn(); pg.click(".modal [data-aplicar]"); pg.wait_for_timeout(900)
    filtrar(lambda: pg.click(".fmodal [data-c=servicos] [data-op=banho]"))
    check("Filtro Propostas: por serviço (banho)", pg.locator("#lista .pwrap").count() == 1 and "PL-F-1" in pg.inner_text("#lista"))
    check("Filtro Propostas: etiqueta removível e contador no botão", pg.locator("#fbar .ftag").count() == 1 and "· 1" in pg.inner_text("#fbar [data-fabrir]"))
    pg.click("#fbar [data-ftira=servicos]"); pg.wait_for_timeout(800)
    check("Filtro Propostas: tirar a etiqueta volta tudo", pg.locator("#lista .pwrap").count() == n_todas)
    filtrar(lambda: pg.click(".fmodal [data-c=criado] [data-per=ult7]"))
    check("Filtro Propostas: feita nos últimos 7 dias (some a de 40 dias)", "PL-F-1" not in pg.inner_text("#lista") and "PL-F-2" in pg.inner_text("#lista"))
    filtrar(lambda: (pg.click(".fmodal [data-c=criado] [data-per=ult7]"), pg.fill(".fmodal [data-c=valor] [data-min]", "1000")))
    check("Filtro Propostas: valor mínimo R$ 1.000", pg.locator("#lista .pwrap").count() == 1 and "PL-F-2" in pg.inner_text("#lista") and "Com os filtros" in pg.inner_text("#funil"))
    go("#/hoje"); go("#/propostas"); pg.wait_for_timeout(700)
    check("Filtro Propostas: lembra o filtro ao voltar para a tela", pg.locator("#fbar .ftag").count() == 1 and pg.locator("#lista .pwrap").count() == 1)
    pg.click("#fbar [data-fabrir]"); pg.wait_for_timeout(300); pg.click(".modal [data-zerar]"); pg.wait_for_timeout(800)
    check("Filtro Propostas: limpar filtros", pg.locator("#fbar .ftag").count() == 0 and pg.locator("#lista .pwrap").count() == n_todas)
    no_hscroll("Propostas com filtros")
    go("#/pets"); tap("#abas .chip[data-v=todos]"); pg.wait_for_timeout(700)
    filtrar(lambda: (pg.click(".fmodal [data-c=especie] [data-op=gato]")))
    check("Filtro Pets: só gatos", "Mia" in pg.inner_text("#lista") and "Thor" not in pg.inner_text("#lista"))
    pg.click("#fbar [data-ftira=especie]"); pg.wait_for_timeout(600)
    filtrar(lambda: pg.click(".fmodal [data-c=cuidados] [data-op=reativo]"))
    check("Filtro Pets: reativos", pg.locator("#lista .item").count() == 1 and "Thor" in pg.inner_text("#lista"))
    pg.click("#fbar [data-ftira=cuidados]"); pg.wait_for_timeout(500)
    go("#/tutores"); pg.wait_for_timeout(700)
    filtrar(lambda: pg.click(".fmodal [data-c=cidades] [data-op='Itajaí']"))
    check("Filtro Tutores: por cidade", pg.locator("#lista .item").count() == 1 and "Fábio" in pg.inner_text("#lista"))
    pg.click("#fbar [data-ftira=cidades]"); pg.wait_for_timeout(500)
    filtrar(lambda: pg.click(".fmodal [data-c=situacao] [data-op=enviada]"))
    check("Filtro Tutores: com orçamento sem resposta", "Fábio" in pg.inner_text("#lista") and "Gabi" not in pg.inner_text("#lista"))
    pg.click("#fbar [data-ftira=situacao]"); pg.wait_for_timeout(500)
    go("#/agenda"); pg.wait_for_timeout(900)
    filtrar(lambda: pg.click(".fmodal [data-c=servicos] [data-op=hosp]"))
    check("Filtro Agenda: só hospedagem esconde a visita de hoje", "Mia" not in pg.inner_text("#selL"))
    pg.click("#fbar [data-ftira=servicos]"); pg.wait_for_timeout(500)
    check("Filtro Agenda: sem filtro mostra a visita", "Mia" in pg.inner_text("#selL"))
    go("#/financeiro"); pg.wait_for_timeout(900)
    tot_ab = pg.locator("#abertos .item").count()
    filtrar(lambda: pg.click(".fmodal [data-c=servicos] [data-op=visitas]"))
    check("Filtro Financeiro: a receber só de visitas", pg.locator("#abertos .item").count() == 2 and tot_ab > 2, f"{tot_ab}->{pg.locator('#abertos .item').count()}")
    pg.click("#fbar [data-ftira=servicos]"); pg.wait_for_timeout(500)
    no_hscroll("Financeiro com filtros")
    pg.evaluate("""() => { const T=window.__FAKE_DB; const ids=['f1','f2']; T.propostas=T.propostas.filter(p=>!ids.includes(p.id)); T.proposta_pets=T.proposta_pets.filter(x=>!ids.includes(x.proposta_id)); T.pagamentos=T.pagamentos.filter(g=>!ids.includes(g.proposta_id)); T.pets=T.pets.filter(p=>!['pf1','pf2'].includes(p.id)); T.tutores=T.tutores.filter(t=>!['tf1','tf2'].includes(t.id)); }""")

    # ---------- v1.5: diário do pet ----------
    pg.evaluate("""() => { const T=window.__FAKE_DB; const h=new Date().toISOString().slice(0,10); const f=new Date(Date.now()+2*86400000).toISOString().slice(0,10);
      T.tutores.push({id:'tD',nome:'Paula Mendes',whatsapp:'(47) 96666-2222'});
      T.pets.push({id:'pD1',tutor_id:'tD',nome:'Pipoca',especie:'cao',porte:'P',passeia:true,ativo:true,reativo:false},{id:'pD2',tutor_id:'tD',nome:'Paçoca',especie:'cao',porte:'P',passeia:true,ativo:true,reativo:false});
      T.propostas.push({id:'d1',numero:'PL-D-1',status:'aceita',servico:'hosp',tutor_id:'tD',tutor_nome:'Paula Mendes',valor_total:300,valor_cheio:300,payload:{},data_inicio:h,data_fim:f,created_at:new Date().toISOString()});
      T.proposta_pets.push({proposta_id:'d1',pet_id:'pD1'},{proposta_id:'d1',pet_id:'pD2'}); }""")
    go("#/hoje"); pg.wait_for_timeout(900)
    check("Diário: botão 'Diário de hoje' no serviço em andamento", pg.locator("a[href='#/diario/d1']").count() == 1)
    pg.click("a[href='#/diario/d1']"); pg.wait_for_timeout(1000)
    check("Diário: abre com os dois pets e o dia de hoje", "Pipoca" in pg.inner_text("#view") and "Paçoca" in pg.inner_text("#view") and pg.inner_text("#dNome").startswith("Hoje"))
    check("Diário: primeiro dia do serviço não volta para o dia anterior", pg.is_disabled("#dPrev"))
    pg.click("[data-t=comeu]"); pg.wait_for_timeout(700)
    check("Diário: 1 toque registra para os 2 pets", DB("T.diario.filter(r=>r.tipo==='comeu').length") == 2)
    check("Diário: linha do tempo junta os dois pets numa linha", pg.locator(".tl-i").count() == 1 and "Pipoca e Paçoca" in pg.inner_text("#dLista"))
    pg.click("#dPets [data-pet=pD2]"); pg.click("[data-t=passeio]"); pg.wait_for_timeout(700)
    check("Diário: registrar só para um pet", DB("T.diario.filter(r=>r.tipo==='passeio').map(r=>r.pet_id).join()") == "pD1")
    pg.click(".toast.acao button"); pg.wait_for_timeout(700)
    check("Diário: desfazer apaga o registro", DB("T.diario.filter(r=>r.tipo==='passeio').length") == 0)
    pg.click("#dPets [data-pet=pD2]")
    pg.click("[data-t=nota]"); pg.wait_for_timeout(300); pg.fill("#dTxt", "Dormiram juntinhos no sofá"); pg.click(".modal [data-ok]"); pg.wait_for_timeout(700)
    check("Diário: recado registrado", "juntinhos" in pg.inner_text("#dLista"))
    with pg.expect_file_chooser() as fc: pg.click("[data-t=foto]")
    fc.value.set_files(str(ROOT / "tests" / "foto_teste.jpg")); pg.wait_for_timeout(1200)
    pg.fill("#dTxt", "Passeio na praia"); pg.click(".modal [data-ok]"); pg.wait_for_timeout(1000)
    check("Diário: foto enviada (armazenamento privado) e aparece na linha do tempo", DB("(()=>{const r=T.diario.find(x=>x.tipo==='foto'); return !!r && !!window.__FAKE_STORE[r.foto_path] && r.foto_path.startsWith('diario/')})()") and pg.locator("#dLista img").count() == 1)
    pg.locator(".tl-i").first.click(); pg.wait_for_timeout(300); pg.fill("#eHora", "07:30"); pg.click(".modal [data-salvar]"); pg.wait_for_timeout(700)
    check("Diário: ajustar a hora de um registro", "07:30" in pg.inner_text("#dLista") and DB("T.diario.filter(r=>r.tipo==='comeu').every(r=>new Date(r.criado_em).getHours()===7)"))
    pg.click("#dRel"); pg.wait_for_timeout(400); rel = pg.inner_text(".modal pre")
    check("Diário: resumo do dia pronto para o WhatsApp", "Resumo de hoje" in rel and "07:30" in rel and "Comeu" in rel and "Oi, Paula" in rel and "wa.me/5547966662222" in pg.get_attribute(".modal a.wa", "href"), rel[:60])
    check("Diário: botão para compartilhar as fotos do dia", pg.locator(".modal [data-fotos]").count() == 1)
    pg.click(".modal [data-close]"); pg.wait_for_timeout(200)
    no_hscroll("Diário")
    pg.screenshot(path=str(OUT / "app_diario.png"))
    go("#/pet/pD1"); pg.wait_for_timeout(1000)
    check("Ficha do pet: mostra o diário", "Diário" in pg.inner_text("#view") and "juntinhos" in pg.inner_text("#diarioPet"))
    pg.evaluate("""() => { const T=window.__FAKE_DB; T.diario=[]; T.propostas=T.propostas.filter(p=>p.id!=='d1'); T.proposta_pets=T.proposta_pets.filter(x=>x.proposta_id!=='d1'); T.pagamentos=T.pagamentos.filter(g=>g.proposta_id!=='d1'); T.pets=T.pets.filter(p=>!['pD1','pD2'].includes(p.id)); T.tutores=T.tutores.filter(t=>t.id!=='tD'); }""")

    # ---------- Falha de rede ao salvar ----------
    go(f"#/proposta/{pid}"); pg.wait_for_timeout(800)
    pg.evaluate("() => { window.__FAKE_FAIL = q => q.t==='propostas' && q.op==='update'; }")
    pg.fill("[data-k=obs]", "vai falhar"); pg.wait_for_timeout(3200)
    check("Erro ao salvar aparece para o usuário", "Erro" in pg.inner_text("#saveState"))
    pg.evaluate("() => { window.__FAKE_FAIL = null; }"); pg.fill("[data-k=obs]", "voltou a internet"); pg.wait_for_timeout(3200)
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
    check("Assistente: sem Cobrar no menu", q.locator("[data-nav=cobrar]").count() == 0)
    q.evaluate("location.hash='#/financeiro'"); q.wait_for_timeout(700)
    check("Assistente: Financeiro bloqueado (volta para Hoje)", q.evaluate("location.hash") == "#/hoje")
    q.evaluate("location.hash='#/proposta/sA'"); q.wait_for_timeout(900)
    t = q.inner_text("#view")
    check("Assistente: serviço abre sem valores, com cuidados e recado", "Duque" in t and "Vermífugo" in t and "caminha" in t and "R$" not in t)
    check("Assistente: serviço tem o botão do diário", q.locator("a[href='#/diario/sA']").count() == 1)
    q.click("a[href='#/diario/sA']"); q.wait_for_timeout(900); q.click("[data-t=comeu]"); q.wait_for_timeout(700)
    check("Assistente: consegue registrar no diário", q.evaluate("window.__FAKE_DB.diario.length") == 1 and "R$" not in q.inner_text("#view"))
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
