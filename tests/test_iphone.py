import os, pathlib
URL = os.environ.get("PETLAR_URL") or pathlib.Path(__file__).resolve().parent.parent.joinpath("public","index.html").as_uri()
"""Teste ponta a ponta no iPhone 16 Pro Max (430x932 @3x) com WebKit, só com toques reais."""
import sys
from playwright.sync_api import sync_playwright

results = []
def check(name, cond, extra=""):
    results.append((bool(cond), name, extra)); print(("OK  " if cond else "ERR ") + name, extra)

with sync_playwright() as p:
    engine = sys.argv[1] if len(sys.argv) > 1 else "webkit"
    br = getattr(p, engine).launch()
    dev = dict(p.devices["iPhone 15 Pro Max"]) if engine == "webkit" else {}
    dev.update(viewport={"width": 430, "height": 932}, device_scale_factor=3, is_mobile=engine=="webkit", has_touch=True)
    if engine != "webkit": dev.pop("default_browser_type", None)
    ctx = br.new_context(**dev, accept_downloads=True, locale="pt-BR")
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(1800)
    pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(1500)

    # sem rolagem horizontal
    sw = pg.evaluate("document.documentElement.scrollWidth")
    check("sem rolagem lateral", sw <= 430, f"scrollWidth={sw}")
    # fontes >= 16px nos inputs (evita zoom do iOS)
    small = pg.evaluate("[...document.querySelectorAll('input:not([type=checkbox]):not([type=file]),select,textarea')].filter(e=>e.offsetParent&&parseFloat(getComputedStyle(e).fontSize)<16).length")
    check("inputs com fonte >= 16px (sem zoom automático)", small == 0, f"pequenos={small}")
    # alvos de toque
    tiny = pg.evaluate("[...document.querySelectorAll('.chip,.btn')].filter(e=>e.offsetParent&&e.getBoundingClientRect().height<40).map(e=>e.textContent.trim())")
    check("botões com altura >= 40px", not tiny, str(tiny))
    check("botão Nova proposta visível no celular", pg.is_visible("#btnNova"))
    check("barra inferior com Ver prévia + Baixar PDF", pg.is_visible("#btnVer") and pg.is_visible("#btnPdf3"))

    # 1 cliente
    pg.tap("[data-k=tutor]"); pg.fill("[data-k=tutor]", "Sabrina")
    for c in ["Itajaí", "Camboriú", "outra", "BC"]:
        pg.tap(f"[data-chips=cidade] .chip[data-v='{c}']")
        on = pg.get_attribute(f"[data-chips=cidade] .chip[data-v='{c}']", "class")
        check(f"chip cidade {c}", "on" in on)
        if c == "outra":
            check("campos de outra cidade aparecem", pg.is_visible("[data-k=cidadeNome]"))
            pg.fill("[data-k=cidadeNome]", "Navegantes"); pg.fill("[data-k=deslocValor]", "50")
            check("PDF mostra Navegantes", "Navegantes" in pg.inner_text("#page"))
    # 2 pets
    pg.fill("#petList [data-pk=nome]", "")
    pg.fill("#petList [data-pk=raca]", "Golden")
    t = pg.inner_text("#page .pn")
    check("sem nome + raça => título 'Seu cãozinho'", t.strip() == "Seu cãozinho", t)
    check("raça aparece na ficha", "Golden" in pg.inner_text("#page .ficha"))
    pg.fill("#petList [data-pk=nome]", "Bento"); pg.fill("#petList [data-pk=idade]", "4 anos")
    pg.select_option("#petList [data-pk=porte]", "M")
    # foto
    with pg.expect_file_chooser() as fc: pg.tap("#petList .ph")
    fc.value.set_files(str(pathlib.Path(__file__).parent/"foto_teste.jpg")); pg.wait_for_timeout(800)
    check("foto entra no formulário", pg.locator("#petList .ph img").count() == 1)
    check("foto entra no PDF", pg.locator("#page .pimg img").count() == 1)
    # gato chip
    pg.tap("#petList .chip[data-v=gato]"); check("chip Gato", "Gato" in pg.inner_text("#page .ficha"))
    pg.tap("#petList .chip[data-v=cao]")
    # adicionar e remover pet
    pg.tap("#addPet"); check("adicionar pet", pg.locator("#petList .pet").count() == 2)
    check("PDF com 2 pets", pg.locator("#page .pets.n2").count() == 1)
    pg.locator("#petList [data-pk=nome]").nth(1).fill("Mia")
    pg.locator("#petList .pet").nth(1).locator(".chip[data-v=gato]").tap()
    pg.locator("#petList [data-rm]").nth(1).tap(); check("remover pet", pg.locator("#petList .pet").count() == 1)
    check("botão Remover foto visível", pg.locator("#petList [data-rmfoto]").first.is_visible())
    pg.locator("#petList [data-rmfoto]").first.tap(); check("remover foto", pg.locator("#petList .ph img").count() == 0 and pg.locator("#page .pimg img").count() == 0)
    pg.tap("[data-chips=cidade] .chip[data-v='BC']")

    # 3 serviços
    def tot(): return pg.inner_text("#calcTot")
    pg.tap("[data-chips=servico] .chip[data-v=visitas]")
    pg.fill("[data-k=v_ini]", "2026-11-20"); pg.fill("[data-k=v_fim]", "2026-11-22")
    check("visitas 3 dias = R$ 210", tot() == "R$ 210", tot())
    pg.select_option("[data-k=v_dia]", "2"); check("2x/dia com 40% na 2ª = R$ 335", tot() == "R$ 335", tot())
    pg.tap("[data-k=v_combo]"); check("combo banho (M) +R$ 90 = R$ 425", tot() == "R$ 425", tot())
    pg.tap("[data-k=v_combo]"); pg.select_option("[data-k=v_dia]", "1")
    pg.tap("[data-chips=servico] .chip[data-v=pacote]")
    for k, v in {"1": "R$ 265", "3": "R$ 820", "5": "R$ 1.250"}.items():
        pg.tap(f"[data-chips=p_plano] .chip[data-v='{k}']"); check(f"pacote {k}x = {v}", tot() == v, tot())
    pg.tap("[data-chips=p_plano] .chip[data-v='outro']"); check("campo Outro aparece", pg.is_visible("[data-k=p_outro]"))
    pg.fill("[data-k=p_outro]", "2"); check("pacote 2x = R$ 600", tot() == "R$ 600", tot())
    pg.fill("[data-k=p_outro]", "10"); check("pacote 10x = R$ 2.250", tot() == "R$ 2.250", tot())
    pg.tap("[data-chips=p_plano] .chip[data-v='3']"); check("campo Outro some", not pg.is_visible("[data-k=p_outro]"))
    pg.tap("[data-chips=servico] .chip[data-v=estendida]"); pg.fill("[data-k=e_qtd]", "2")
    check("estendida 2x = R$ 300", tot() == "R$ 300", tot())
    pg.tap("[data-chips=servico] .chip[data-v=hosp]")
    pg.fill("[data-k=h_in]", "2026-12-06"); pg.fill("[data-k=h_out]", "2027-01-02")
    check("hospedagem Bento = R$ 2.380", tot() == "R$ 2.380", tot())
    pg.fill("[data-k=descManual]", "20"); check("desconto especial 20% = R$ 2.240", tot() == "R$ 2.240", tot())
    pg.fill("[data-k=descManual]", "25"); check("aviso acima de 15%", pg.is_visible("#descWarn"))
    pg.fill("[data-k=descManual]", "")
    pg.tap("[data-chips=cidade] .chip[data-v='Itajaí']")
    check("levar e buscar aparece fora de BC", pg.is_visible("#levaTrazWrap"))
    pg.tap("[data-k=h_leva]"); check("levar e buscar = +R$ 60", tot() == "R$ 2.440", tot())
    pg.tap("[data-k=h_leva]"); pg.tap("[data-chips=cidade] .chip[data-v='BC']")
    pg.tap("[data-chips=servico] .chip[data-v=banho]")
    for k, v in {"avulso": "R$ 120", "quinzenal": "R$ 215", "semanal": "R$ 410"}.items():
        pg.tap(f"[data-chips=b_plano] .chip[data-v='{k}']"); check(f"banho {k} = {v}", tot() == v, tot())
    txt = pg.inner_text("#page")
    check("texto 'Ambiente do jeito que estava'", "Ambiente do jeito que estava" in txt and "Banheiro" not in txt)
    check("sem badge de Economia no PDF", "Economia de" not in txt)

    # 4 adicionais
    pg.tap("[data-chips=b_plano] .chip[data-v='avulso']")
    pg.tap("#addPresets [data-preset=cuidado]"); check("adicional cuidado especial +15% = R$ 140", tot() == "R$ 140", tot())
    check("adicional aparece no PDF", "Cuidado especial" in pg.inner_text("#page .inv"))
    pg.tap("#addList [data-ak=mostrar]"); check("ocultar adicional do PDF", "Cuidado especial" not in pg.inner_text("#page .inv") and tot() == "R$ 140")
    pg.tap("#addPresets [data-preset=outro]")
    pg.locator("#addList .add").nth(1).locator("[data-ak=desc]").fill("Horário noturno")
    pg.locator("#addList .add").nth(1).locator("[data-ak=valor]").fill("20")
    check("adicional R$ único = R$ 160", tot() == "R$ 160", tot())
    pg.locator("#addList .add").nth(1).locator("[data-ak=tipo]").select_option("pct")
    check("trocar tipo para % = R$ 160", tot() == "R$ 160", tot())
    pg.tap("#addPresets [data-preset=reativo]"); check("pet reativo +20% = R$ 185", tot() == "R$ 185", tot())
    while pg.locator("#addList [data-arm]").count(): pg.locator("#addList [data-arm]").first.tap()
    check("remover adicionais volta a R$ 120", tot() == "R$ 120", tot())
    pg.fill("[data-k=obs]", "Levo tudo, você não precisa separar nada 🐾")
    check("recado no PDF", "Levo tudo" in pg.inner_text("#page"))

    # rascunho persiste
    pg.wait_for_timeout(500); pg.reload(); pg.wait_for_timeout(1500)
    check("rascunho salvo ao recarregar", pg.input_value("[data-k=tutor]") == "Sabrina" and pg.input_value("#petList [data-pk=nome]") == "Bento")

    # ver prévia
    pg.tap("#btnVer"); pg.wait_for_timeout(900)
    check("Ver prévia rola até o PDF", pg.evaluate("document.querySelector('.pv').getBoundingClientRect().top") < 300)
    check("botão vira Editar", pg.inner_text("#btnVer") == "Editar")
    pg.screenshot(path="tests/output/m_preview.png")
    pg.tap("#btnVer"); pg.wait_for_timeout(900)
    check("Editar volta ao topo", pg.evaluate("window.scrollY") < 50)
    pw = pg.evaluate("document.getElementById('stage').getBoundingClientRect().width")
    check("prévia cabe na tela", pw <= 430, f"{pw}px")

    # PDF
    with pg.expect_download(timeout=60000) as d: pg.tap("#btnPdf3")
    d.value.save_as("tests/output/iphone.pdf"); check("PDF baixado", True, d.value.suggested_filename)

    # nova proposta (2 toques)
    pg.evaluate("window.scrollTo(0,0)"); pg.tap("#btnNova")
    check("1º toque pede confirmação", "Confirmar" in pg.inner_text("#btnNova"))
    pg.tap("#btnNova"); pg.wait_for_timeout(300)
    check("2º toque limpa tudo", pg.input_value("[data-k=tutor]") == "" and pg.input_value("#petList [data-pk=nome]") == "" and pg.locator("#addList .add").count() == 0)

    pg.screenshot(path="tests/output/m_top.png")
    pg.screenshot(path="tests/output/m_full.png", full_page=True)
    check("sem erros de JavaScript", not errs, str(errs))
    br.close()
bad = [r for r in results if not r[0]]
print(f"\n{len(results)-len(bad)}/{len(results)} ok")
