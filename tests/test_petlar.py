import os, pathlib
URL = os.environ.get("PETLAR_URL") or pathlib.Path(__file__).resolve().parent.parent.joinpath("public","index.html").as_uri()
import json, sys
from playwright.sync_api import sync_playwright

CASES = [
  ("Duque hosp 23-27/12 = 5 diárias c/ feriado = 540", dict(servico="hosp", h_in="2026-12-23", h_out="2026-12-27", pets=[dict(nome="Duque",especie="cao",porte="P",passeia=True)]), 540),
  ("Karina 6 visitas 2 gatos = 485", dict(servico="visitas", v_ini="2026-11-10", v_fim="2026-11-15", pets=[dict(nome="A",especie="gato",porte="P",passeia=False),dict(nome="B",especie="gato",porte="P",passeia=False)]), 485),
  ("Bento 06/12-02/01 = 28 diárias = 2380", dict(servico="hosp", h_in="2026-12-06", h_out="2027-01-02", pets=[dict(nome="Bento",especie="cao",porte="M",passeia=True)]), 2380),
  ("Bento exceção 20% = 2240", dict(servico="hosp", h_in="2026-12-06", h_out="2027-01-02", descManual="20", pets=[dict(nome="Bento",especie="cao",porte="M",passeia=True)]), 2240),
  ("Pacote 3x = 820", dict(servico="pacote", p_plano="3", pets=[dict(nome="X",especie="cao",porte="M",passeia=True)]), 820),
  ("Pacote 5x = 1250", dict(servico="pacote", p_plano="5", pets=[dict(nome="X",especie="cao",porte="M",passeia=True)]), 1250),
  ("Viagem 7 dias = 465", dict(servico="visitas", v_ini="2026-11-10", v_fim="2026-11-16", pets=[dict(nome="X",especie="cao",porte="M",passeia=True)]), 465),
  ("Viagem 25 dias = 1490", dict(servico="visitas", v_ini="2026-11-01", v_fim="2026-11-25", pets=[dict(nome="X",especie="cao",porte="M",passeia=True)]), 1490),
  ("Banho M quinzenal = 215", dict(servico="banho", b_plano="quinzenal", pets=[dict(nome="X",especie="cao",porte="M",passeia=True)]), 215),
  ("Estendida Itajaí = 150+30", dict(servico="estendida", e_qtd=1, cidade="Itajaí", pets=[dict(nome="Zully",especie="cao",porte="M",passeia=True)]), 180),
]

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width":1400,"height":1000})
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(1500)
    ok=True
    for name, st, exp in CASES:
        got = pg.evaluate("""(st)=>{ S=Object.assign(blank(), st); S.pets=st.pets.map(x=>Object.assign(newPet(),x)); return calc().final; }""", st)
        flag = "OK " if got==exp else "ERR"; ok &= got==exp
        print(flag, name, "->", got)
    # visual: Bento proposal
    pg.evaluate("""()=>{ S=Object.assign(blank(),{tutor:"Sabrina",servico:"hosp",h_in:"2026-12-06",h_out:"2027-01-03",descManual:"20",obs:"Na virada eu fico com ele por causa dos fogos."});
      S.pets=[Object.assign(newPet(),{nome:"Bento",raca:"SRD",idade:"4 anos",porte:"M"})]; CFG.whats="(47) 99999-0000"; bindValues(); update(true); }""")
    pg.wait_for_timeout(800)
    pg.screenshot(path="tests/output/shot_app.png")
    pg.locator("#page").screenshot(path="tests/output/shot_page.png")
    # 2 pets visit, Itajaí combo
    pg.evaluate("""()=>{ S=Object.assign(blank(),{tutor:"Carlos",cidade:"Itajaí",servico:"visitas",v_ini:"2026-12-22",v_fim:"2026-12-26",v_combo:true});
      S.pets=[Object.assign(newPet(),{nome:"Zully",raca:"Golden",idade:"2 anos",porte:"G"}),Object.assign(newPet(),{nome:"Mia",especie:"gato",raca:"Siamês"})]; bindValues(); update(true); }""")
    pg.wait_for_timeout(500)
    pg.locator("#page").screenshot(path="tests/output/shot_page2.png")
    print("calc2:", pg.evaluate("()=>{const r=calc(); return [r.final,r.full,r.lines.map(l=>l.l+': '+l.v), r.holidays]}"))
    # pdf generation
    pg.evaluate("()=>{window.__pdf=null; window.jspdf.jsPDF.prototype._out=1;}")
    with pg.expect_download(timeout=30000) as d:
        pg.click("#btnPdf")
    d.value.save_as("tests/output/teste.pdf"); print("pdf:", d.value.suggested_filename)
    # mobile
    m = b.new_page(viewport={"width":390,"height":844}); m.goto(URL); m.wait_for_timeout(1200); m.screenshot(path="tests/output/shot_mobile.png", full_page=False)
    print("errors:", errs)
    b.close()
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); pg.goto(URL); pg.wait_for_timeout(1200)
    for (i,o,exp) in [("2026-11-10","2026-11-12",300),("2026-11-10","2026-11-10",100),("2026-12-06","2027-01-03",2465)]:
        r=pg.evaluate("""([i,o])=>{S=Object.assign(blank(),{servico:"hosp",h_in:i,h_out:o}); S.pets=[Object.assign(newPet(),{nome:"X",porte:"M"})]; const r=calc(); return [r.count,r.final]}""",[i,o])
        print("OK " if r[1]==exp else "ERR", f"hosp {i}→{o}: {r[0]} diárias = R$ {r[1]} (esperado {exp})")
    b.close()
