// Tela de proposta: gerador (tabela v2.3) + salvar no banco + enviar (PDF, imagem, WhatsApp, Pix)
import * as U from "../ui.js";
import * as db from "../db.js";
import { pixPayload, pixQR } from "../pix.js";
import { setNavGuard, replaceHash } from "../app.js";
import { ic } from "../icones.js";

const toast = U.toast;

const TEMPLATE = `
<div class="prop-head">
  <a class="backlink" href="#/propostas">‹ Propostas</a>
  <span class="num" id="pNum">Nova proposta</span><span id="pStatus"></span>
  <span class="sp"></span>
  <button class="btn soft small" id="pMenu" aria-label="Mais ações">•••</button>
  <button class="btn primary small" id="pEnviar">Enviar</button>
</div>
<main class="layout">
  <section class="form">
    <div id="impBanner"></div>
    <div class="card">
      <h3><span class="n">1</span>Cliente</h3>
      <div id="tutorLinked"></div>
      <div class="ac"><label class="f">Nome do tutor<input type="text" data-k="tutor" placeholder="Digite para buscar ou cadastrar" autocomplete="off"></label><div class="ac-list hide" id="acList"></div></div>
      <label class="f">WhatsApp do tutor<input type="tel" data-k="tutorWhats" inputmode="tel" placeholder="(47) 9 9999-9999"></label>
      <label class="f">Onde é o atendimento</label>
      <div class="chips" data-chips="cidade">
        <button class="chip" data-v="BC">Balneário Camboriú</button>
        <button class="chip" data-v="Itajaí">Itajaí</button>
        <button class="chip" data-v="Camboriú">Camboriú</button>
        <button class="chip" data-v="outra">Outra cidade</button>
      </div>
      <div class="row" data-city-outra>
        <label class="f">Qual cidade<input type="text" data-k="cidadeNome" placeholder="Ex.: Navegantes"></label>
        <label class="f">R$ por deslocamento<input type="number" min="0" step="5" data-k="deslocValor"></label>
      </div>
      <div class="row">
        <label class="f">Data da proposta<input type="date" data-k="data"></label>
        <label class="f">Vale por (dias)<input type="number" min="1" data-k="validade"></label>
      </div>
    </div>
    <div class="card">
      <h3><span class="n">2</span>Pets</h3>
      <div class="tutor-pets" id="tutorPets"></div>
      <div id="petList"></div>
      <button class="btn soft small" id="addPet">+ Adicionar outro pet</button>
    </div>
    <div class="card">
      <h3><span class="n">3</span>Serviço</h3>
      <div id="optTabs" class="opt-tabs"></div>
      <div class="chips" data-chips="servico">
        <button class="chip" data-v="visitas">Visitas (viagem)</button>
        <button class="chip" data-v="pacote">Pacote mensal</button>
        <button class="chip" data-v="estendida">Visita estendida</button>
        <button class="chip" data-v="hosp">Hospedagem</button>
        <button class="chip" data-v="banho">Banho em casa</button>
      </div>
      <div data-show="visitas">
        <div class="row">
          <label class="f">Primeiro dia<input type="date" data-k="v_ini"></label>
          <label class="f">Último dia<input type="date" data-k="v_fim"></label>
        </div>
        <label class="f">Visitas por dia
          <select data-k="v_dia"><option value="1">1 visita por dia</option><option value="2">2 visitas por dia</option></select>
        </label>
        <label class="check"><input type="checkbox" data-k="v_combo"> Banho no último dia (combo, o tutor volta e encontra o pet limpo)</label>
      </div>
      <div data-show="pacote">
        <label class="f">Plano</label>
        <div class="chips" data-chips="p_plano">
          <button class="chip" data-v="1">1x/semana</button>
          <button class="chip" data-v="3">3x/semana</button>
          <button class="chip" data-v="5">5x/semana</button>
          <button class="chip" data-v="outro">Outro</button>
        </div>
        <label class="f" data-pacote-outro>Quantas visitas por semana <span class="hint">Ex.: 2, 4, 7 ou 10 (10 = alguns dias com 2 visitas)</span><input type="number" min="1" max="14" step="1" inputmode="numeric" data-k="p_outro" placeholder="Ex.: 2"></label>
        <label class="f">Começa em<input type="date" data-k="p_ini"></label>
      </div>
      <div data-show="estendida">
        <div class="row">
          <label class="f">Quantas visitas de 3h<input type="number" min="1" data-k="e_qtd"></label>
          <label class="f">Data (se for uma só)<input type="date" data-k="e_data"></label>
        </div>
      </div>
      <div data-show="hosp">
        <div class="row">
          <label class="f">Entrada<input type="date" data-k="h_in"></label>
          <label class="f">Saída<input type="date" data-k="h_out"></label>
        </div>
        <label class="check" id="levaTrazWrap"><input type="checkbox" data-k="h_leva"> Buscar e levar o pet (cobra deslocamento ida e volta)</label>
      </div>
      <div data-show="banho">
        <label class="f">Plano</label>
        <div class="chips" data-chips="b_plano">
          <button class="chip" data-v="avulso">Avulso</button>
          <button class="chip" data-v="quinzenal">Quinzenal (2x/mês)</button>
          <button class="chip" data-v="semanal">Semanal (4x/mês)</button>
        </div>
        <label class="f">Data do banho (ou início)<input type="date" data-k="b_data"></label>
      </div>
    </div>
    <div class="card">
      <h3><span class="n">4</span>Ajustes e recado <span class="hint" id="ajOpt"></span></h3>
      <label class="f">Desconto especial (%) <span class="hint">Deixe vazio para usar a regra da tabela. Hoje: <b id="autoDesc">—</b></span>
        <input type="number" min="0" max="50" step="1" data-k="descManual" placeholder="Automático">
      </label>
      <div id="descWarn" class="warn hide">Acima do teto de 15%. Tudo bem se for uma exceção combinada.</div>
      <label class="f">Valor final combinado (R$) <span class="hint">Deixe vazio para usar a conta da tabela. Use quando fechar um valor diferente com o cliente. Conta da tabela: <b id="valorTabela">—</b></span>
        <input type="number" min="0" step="5" inputmode="decimal" data-k="valorFechado" placeholder="Pela tabela">
      </label>
      <label class="f" style="margin-bottom:6px">Adicionais <span class="hint">Cuidado especial, pet reativo, horário fora do comum… em % ou em R$.</span></label>
      <div id="addList"></div>
      <div class="chips" id="addPresets">
        <button class="chip" data-preset="cuidado">+ Cuidado especial</button>
        <button class="chip" data-preset="reativo">+ Pet reativo</button>
        <button class="chip" data-preset="outro">+ Outro adicional</button>
      </div>
      <label class="f">Recado / observações (aparece no PDF)<textarea data-k="obs" placeholder="Ex.: Vou mandar fotinhos todo dia e na virada fico com ele por causa dos fogos"></textarea></label>
    </div>
    <div class="calc">
      <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.6;margin-bottom:6px">Conta (só você vê)</div>
      <div class="lines" id="calcLines"></div>
      <div class="tot"><span>Total da proposta</span><b id="calcTot">R$ 0</b></div>
      <div class="int" id="calcInt"></div>
    </div>
    <div id="pagtosBox"></div>
  </section>
  <section class="pv">
    <div class="pv-bar"><span>Prévia do PDF</span><span class="row-actions"><button class="btn soft small" id="btnCard">Imagem</button><button class="btn soft small" id="btnPdf2">PDF</button></span></div>
    <div class="stage" id="stage"><div class="scaler" id="scaler"><div class="page" id="page"></div></div></div>
  </section>
</main>
<div class="mobile-cta"><button class="btn soft" id="btnVer">Ver prévia</button><button class="btn primary" id="btnEnviar2">Enviar</button></div>
<input type="file" accept="image/*" id="petFile" class="hide">
<div id="cardHolder" style="position:fixed;left:-10000px;top:0"></div>`;

export async function mount(root, ctx) {
  const [param, acao] = ctx.params || [];
  const listeners = [];
  const on = (el, ev, fn, opt) => { el.addEventListener(ev, fn, opt); listeners.push([el, ev, fn, opt]); };
  const SET = await db.getSettings().catch(() => ({}));
  const META = { id: null, numero: null, status: "rascunho" };
  let alive = true; // vira false ao sair da tela (salvamentos atrasados não mexem na tela nova)
  root.innerHTML = TEMPLATE;
  let markDirty = () => {}; // definido mais abaixo (o núcleo chama antes)
  let pixState = { key: "", url: "" };

  /* ======== núcleo do gerador (preços e prévia) ======== */
  /* ================= CONFIG — Tabela v2.2 (nov/2026) ================= */
  const T = {
    visita:70, estendida:150, desloc:30, extraPasseio:0.60, extraSemPasseio:15, feriado:0.20,
    hosp:{P:100,M:100,G:120,GG:120,gato:100}, hospExtra:0.60,
    banho:{P:90,M:120,G:160,GG:200,gato:100},
    combo:{P:70,M:90,G:120,GG:150,gato:80}, banho2pet:0.10,
    pacotes:{1:{v:4,d:.05},3:{v:13,d:.10},5:{v:21,d:.15}}, segundaVisita:0.40, semanasMes:4.3,
    banhoPlano:{avulso:{n:1,d:0},quinzenal:{n:2,d:.10},semanal:{n:4,d:.15}},
  };
  const AVATAR = "/assets/avatar.webp";
  const CONTATO = {whats:"(47) 99917-9091", insta:"@petlar.bc"};
  const LOGO = "/assets/logo-petlar.webp"; // logo oficial (Manual de Identidade, versão principal empilhada)
  const PORTES = {P:"Pequeno (até 10 kg)",M:"Médio (10–25 kg)",G:"Grande (25–40 kg)",GG:"Gigante (40 kg+)"};

  /* ================= STATE ================= */
  const today = () => { const d=new Date(); return iso(d); };
  function iso(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
  function blank(){ return {
    tutor:"", cidade:"BC", data:today(), validade:7, servico:"visitas",
    pets:[newPet()],
    v_ini:"", v_fim:"", v_dia:"1", v_combo:false,
    p_plano:"3", p_outro:"", p_ini:"", e_qtd:1, e_data:"", h_in:"", h_out:"", h_leva:false,
    b_plano:"avulso", b_data:"", descManual:"", valorFechado:"", obs:"", alt:null, editando:1, recomendada:1, escolhida:null, adds:[], cidadeNome:"", deslocValor:30, tutor_id:null, tutorWhats:"" }; }
  function newPet(){ return {id:Math.random().toString(36).slice(2,8), pet_id:null, foto_path:null, nome:"", especie:"cao", raca:"", idade:"", porte:"P", passeia:true, foto:"", alimentacao:"", medicacao:"", comportamento:"", limitacoes:"", veterinario:"", reativo:false}; }

  const store = { get(k){ try{return JSON.parse(localStorage.getItem(k));}catch(e){return null;} },
                  set(k,v){ try{localStorage.setItem(k,JSON.stringify(v));}catch(e){} } };
  let S = blank();
  const CFG = {whats:SET.whatsapp||CONTATO.whats, insta:SET.instagram||CONTATO.insta};

  /* ================= HELPERS ================= */
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const brl = v => "R$ " + Math.round(v).toLocaleString("pt-BR");
  const brl2 = v => "R$ " + (Math.round(v*100)/100).toLocaleString("pt-BR",{minimumFractionDigits: v%1?2:0, maximumFractionDigits:2});
  const r5 = v => Math.round(v/5)*5;
  const esc = s => String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  function pd(s){ if(!s) return null; const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); }
  function fmt(d){ return d? String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0") : ""; }
  function fmtY(d){ return d? fmt(d)+"/"+d.getFullYear() : ""; }
  function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
  function daysBetween(a,b){ return Math.round((b-a)/86400000); }
  function easter(y){ const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1; return new Date(y,mo-1,da); }
  function isFeriado(d){ const m=d.getMonth()+1, day=d.getDate();
    if((m===12&&(day===24||day===25||day===31))||(m===1&&day===1)) return true;
    const e=easter(d.getFullYear()); const seg=addDays(e,-48), ter=addDays(e,-47);
    return [seg,ter].some(x=>x.getMonth()===d.getMonth()&&x.getDate()===day); }
  const petKey = p => p.especie==="gato" ? "gato" : p.porte;
  const PORTE_TXT={P:"pequeno",M:"médio",G:"grande",GG:"gigante"};
  function unnamedIdx(p){ const un=S.pets.filter(x=>!x.nome.trim()&&x.especie===p.especie); return un.length>1? " "+(un.indexOf(p)+1):""; }
  // título do card do pet (PDF)
  function petTitle(p){ if(p.nome.trim()) return p.nome.trim();
    return (p.especie==="gato"?"Seu gatinho":"Seu cãozinho")+unnamedIdx(p); }
  // referência curta nas linhas de preço
  function petName(p){ if(p.nome.trim()) return p.nome.trim();
    const same=S.pets.filter(x=>!x.nome.trim()&&x.especie===p.especie&&(p.especie==="gato"||x.porte===p.porte));
    const base = p.especie==="gato" ? "gato" : "cão porte "+p.porte; return base+(same.length>1?" "+(same.indexOf(p)+1):""); }
  function namesList(arr){
    if(arr.every(p=>p.nome.trim())){ const n=arr.map(p=>p.nome.trim()); return n.length===1? n[0] : n.slice(0,-1).join(", ")+" e "+n[n.length-1]; }
    if(arr.length===1) return arr[0].especie==="gato"?"seu gatinho":"seu cãozinho";
    const g=arr.filter(p=>p.especie==="gato").length, c=arr.length-g;
    if(!g) return `seus ${c} cãezinhos`; if(!c) return `seus ${g} gatinhos`; return `seus ${arr.length} pets`; }
  function fileNames(arr){ return arr.every(p=>p.nome.trim()) ? namesList(arr) : (arr.length>1? arr.length+" pets" : (arr[0].especie==="gato"?"gato":"cão")); }

  /* ================= PRICING ================= */
  function walkers(){ return S.pets.filter(p=>p.especie!=="gato" && p.passeia); }
  function visitUnit(base){ // base value for the 1st pet; returns {unit, extras:[{pet,val}]}
    const pets=[...S.pets]; let first = pets.findIndex(p=>p.especie!=="gato"&&p.passeia); if(first<0) first=0;
    const extras=[]; pets.forEach((p,i)=>{ if(i===first) return;
      const v = (p.especie!=="gato"&&p.passeia) ? base*T.extraPasseio : T.extraSemPasseio; extras.push({pet:p,val:v}); });
    return {unit: base + extras.reduce((a,e)=>a+e.val,0), extras, firstPet:pets[first]};
  }
  function pushExtras(R, extras, mult, suffix){
    if(!extras.length) return;
    if(extras.length===1){ const e=extras[0]; R.lines.push({l:`${petName(e.pet)} (pet adicional${e.val===T.extraSemPasseio?", sem passeio":""})${suffix?" · + "+brl2(e.val)+suffix:""}`, v:e.val*mult}); return; }
    const tot=extras.reduce((a,e)=>a+e.val,0);
    R.lines.push({l:`${extras.length} pets adicionais (${extras.map(petName).join(", ")})${suffix?" · + "+brl2(tot)+suffix:""}`, v:tot*mult});
  }
  // mês = 4,3 semanas (há meses com 4 e meses com 5 semanas). 1x=4 · 3x=13 · 5x=21 (tabela oficial)
  function visitasMes(nSem){ return Math.round(nSem*T.semanasMes - 0.01); }
  function pacoteDesc(nSem){ return nSem>=5? .15 : nSem>=3? .10 : .05; }
  function travelDisc(days){ return days>=25?.15: days>=10?.10: days>=5?.05:0; }
  function hospDisc(n){ return n>=21?.15: n>=7?.10:0; }

  function calc(){
    const R = {ok:true, lines:[], disc:0, discAuto:0, discountable:0, fixed:0, desloc:0, deslocN:0,
               count:0, unitLabel:"", when:[], holidays:0, title:"", subtitle:"", inc:[], msg:""};
    const fora = S.cidade!=="BC";
    R.cidadeTxt = S.cidade==="outra" ? (S.cidadeNome.trim()||"outra cidade") : S.cidade;
    R.deslocUnit = S.cidade==="outra" ? Math.max(0,Number(S.deslocValor)||0) : T.desloc;
    const dm = S.descManual!=="" && S.descManual!=null ? Math.max(0,Number(S.descManual))/100 : null;

    if(S.servico==="visitas"){
      const a=pd(S.v_ini), b=pd(S.v_fim);
      R.title="Pet Sitter · Visitas em casa";
      if(!a||!b||b<a){ R.ok=false; R.msg="Coloque o primeiro e o último dia das visitas."; return R; }
      const days=daysBetween(a,b)+1, porDia=Number(S.v_dia)||1, n=days*porDia;
      const {unit,extras,firstPet}=visitUnit(T.visita);
      let mult=0, mult2=0; for(let i=0;i<days;i++){ const f=isFeriado(addDays(a,i)); if(f) R.holidays+=porDia; const m=(f?1+T.feriado:1); mult+=porDia*m; if(porDia>1) mult2+=m; }
      const hol=R.holidays>0;
      R.lines.push({l: hol? `${n} visitas · ${petName(firstPet)}` : `${n} visitas × ${brl(T.visita)} · ${petName(firstPet)}`, v:T.visita*mult});
      pushExtras(R, extras, mult, hol?"":" por visita");
      R.discountable = unit*mult;
      if(mult2){ const dv=unit*mult2*T.segundaVisita; R.extraOff=dv; R.lines.push({l:`Desconto na 2ª visita do dia (${Math.round(T.segundaVisita*100)}%) · ${days} ${days>1?"visitas":"visita"}`, v:-dv, neg:true}); R.discountable-=dv; }
      R.discAuto=travelDisc(days); R.count=n; R.unitLabel="visita";
      R.when=[`<b>${fmtY(a)}</b> a <b>${fmtY(b)}</b>`, `${days} ${days>1?"dias":"dia"} · ${porDia} ${porDia>1?"visitas":"visita"} por dia · <b>${n} visitas</b>`];
      if(S.v_combo){ let v=0; S.pets.forEach((p,i)=>{ v+= T.combo[petKey(p)]*(i>0?1-T.banho2pet:1); });
        const np=S.pets.length; R.lines.push({l: np>1?`Banho no último dia · ${np} pets (2º em diante −10%)`:`Banho no último dia · ${petName(S.pets[0])}`, v}); R.fixed+=v;
        R.when.push(`Banho em casa no último dia (<b>${fmt(b)}</b>)`); }
      if(fora){ R.deslocN=n; }
      R.inc = incVisita().concat(S.v_combo?[["banho","Banho no último dia","Com tosa higiênica, sem sair de casa"]]:[]);
    }
    else if(S.servico==="pacote"){
      const nSem = S.p_plano==="outro" ? Math.min(14,Math.max(0,Math.round(Number(S.p_outro)||0))) : Number(S.p_plano)||3;
      R.title=`Pet Sitter · Pacote ${nSem||"?"}x/semana`;
      if(!nSem){ R.ok=false; R.msg="Digite quantas visitas por semana."; return R; }
      const P={v:visitasMes(nSem), d:pacoteDesc(nSem)}; const {unit,extras,firstPet}=visitUnit(T.visita);
      R.lines.push({l:`${P.v} visitas no mês × ${brl(T.visita)} · ${petName(firstPet)}`, v:T.visita*P.v});
      pushExtras(R, extras, P.v, " × "+P.v);
      R.discountable=unit*P.v;
      const seg = P.v - visitasMes(Math.min(nSem,7)); // visitas além de 1 por dia = 2ª visita do dia
      if(seg>0){ const dv=unit*seg*T.segundaVisita; R.extraOff=dv; R.lines.push({l:`Desconto na 2ª visita do dia (${Math.round(T.segundaVisita*100)}%) · ${seg} visitas`, v:-dv, neg:true}); R.discountable-=dv; }
      R.discAuto=P.d; R.count=P.v; R.unitLabel="visita";
      const a=pd(S.p_ini);
      R.when=[`<b>${nSem} visitas por semana</b>${nSem>7?" (alguns dias com 2 visitas)":""} · cerca de ${P.v} visitas no mês`, a?`Começa em <b>${fmtY(a)}</b> · valor mensal`:"Valor mensal", "Visitas dentro do mês, sem acumular para o seguinte"];
      if(fora) R.deslocN=P.v;
      R.inc=incVisita();
    }
    else if(S.servico==="estendida"){
      const q=Math.max(1,Number(S.e_qtd)||1); const {unit,extras,firstPet}=visitUnit(T.estendida);
      const d=pd(S.e_data); const f = (q===1&&d&&isFeriado(d)); if(f) R.holidays=1; const m=f?1+T.feriado:1;
      R.title="Visita estendida · 3 horas";
      R.lines.push({l: f?`${q} visita estendida · ${petName(firstPet)}`:`${q} × visita estendida ${brl(T.estendida)} · ${petName(firstPet)}`, v:T.estendida*q*m});
      pushExtras(R, extras, q*m, "");
      R.discountable=unit*q*m; R.discAuto=0; R.count=q; R.unitLabel="visita";
      R.when=[d&&q===1?`<b>${fmtY(d)}</b>`:`<b>${q} ${q>1?"visitas":"visita"}</b> de 3 horas`, "Ideal para a primeira visita, adaptação ou quando o tutor passa o dia fora"];
      if(fora) R.deslocN=q;
      R.inc=[["clock","3 horas de companhia","Tempo de sobra para o pet não sentir falta"]].concat(incVisita());
    }
    else if(S.servico==="hosp"){
      const a=pd(S.h_in), b=pd(S.h_out);
      R.title="Hospedagem no Pet Lar";
      if(!a||!b||b<a){ R.ok=false; R.msg="Coloque a data de entrada e de saída."; return R; }
      const n=daysBetween(a,b)+1; // conta o dia de entrada e o de saída (3 dias = 3 diárias)
      const pets=[...S.pets].sort((x,y)=>T.hosp[petKey(y)]-T.hosp[petKey(x)]);
      let mult=0; for(let i=0;i<n;i++){ const f=n<21&&isFeriado(addDays(a,i)); if(f) R.holidays++; mult+=f?1+T.feriado:1; }
      const hol=R.holidays>0; let daily=0;
      pets.forEach((p,i)=>{ const d=T.hosp[petKey(p)]*(i===0?1:T.hospExtra); daily+=d;
        R.lines.push({l: hol?`${n} ${n>1?"diárias":"diária"} · ${petName(p)}${i?" (pet adicional)":""}`:`${n} ${n>1?"diárias":"diária"} × ${brl(d)} · ${petName(p)}${i?" (pet adicional, 60%)":""}`, v:d*mult}); });
      R.discountable=daily*mult; R.discAuto=hospDisc(n); R.count=n; R.unitLabel="dia";
      R.when=[`Entrada <b>${fmtY(a)}</b> · Saída <b>${fmtY(b)}</b>`, `<b>${n} ${n>1?"diárias":"diária"}</b> em casa, com a gente`];
      if(fora && S.h_leva) R.deslocN=2;
      R.inc=incHosp();
    }
    else if(S.servico==="banho"){
      const P=T.banhoPlano[S.b_plano]||T.banhoPlano.avulso; const d=pd(S.b_data);
      const f = P.n===1 && d && isFeriado(d); if(f) R.holidays=1; const m=f?1+T.feriado:1;
      const planName={avulso:"Banho em Casa",quinzenal:"Banho em Casa · Plano quinzenal",semanal:"Banho em Casa · Plano semanal"}[S.b_plano];
      R.title=planName;
      let second=0;
      S.pets.forEach((p,i)=>{ const v=T.banho[petKey(p)]*P.n*m;
        R.lines.push({l:`${P.n>1?P.n+" banhos":"Banho"} · ${petName(p)}${p.nome.trim()?` (${p.especie==="gato"?"gato":"porte "+p.porte})`:""}`, v});
        if(i>0) second+=v; });
      R.discountable=R.lines.reduce((a,x)=>a+x.v,0); R.discAuto=P.d; R.count=P.n*S.pets.length; R.unitLabel="banho";
      R.second2=second;
      R.when=[ P.n===1? (d?`<b>${fmtY(d)}</b>`:"Data a combinar") : `<b>${P.n} banhos por mês</b>${d?" · começa em <b>"+fmtY(d)+"</b>":""}`, "Na casa do tutor, sem levar o pet a lugar nenhum"];
      if(S.b_plano==="semanal" && S.pets.some(p=>p.especie==="gato")) R.warnGato=true;
      if(fora) R.deslocN=P.n;
      R.inc=incBanho();
    }

    R.disc = dm!==null ? dm : R.discAuto;
    const discVal = R.discountable*R.disc;
    let after = R.discountable - discVal;
    if(S.servico==="banho" && R.second2) after -= R.second2*(1-R.disc)*T.banho2pet;
    R.desloc = R.deslocN*R.deslocUnit;
    // adicionais
    const base = after + R.fixed; R.addLines=[]; let addTot=0, addFull=0;
    (S.adds||[]).forEach(a=>{ const v=Number(a.valor)||0; if(!v) return; let val=0, lbl=a.desc.trim()||"Adicional";
      if(a.tipo==="pct"){ val=base*v/100; lbl+=` (+${v}%)`; addFull+= (R.discountable+R.fixed)*v/100; }
      else if(a.tipo==="unit"){ val=v*R.count; lbl+=` · + ${brl2(v)} por ${R.unitLabel} × ${R.count}`; addFull+=val; }
      else { val=v; addFull+=val; }
      addTot+=val; R.addLines.push({l:lbl, v:val, show:a.mostrar!==false}); });
    R.full = R.discountable + (R.extraOff||0) + R.fixed + addFull + R.desloc;
    R.final = r5(base + addTot) + R.desloc;
    R.full = Math.max(R.full, R.final);
    R.save = R.full - R.final;
    R.tabela = R.final;
    const vf = Number(S.valorFechado) || 0;
    if (vf > 0) { R.ajuste = vf - R.final; R.final = vf; R.full = Math.max(R.full, vf); R.save = R.full - R.final; }
    R.perUnit = R.count ? (R.final - R.desloc) / R.count : 0;
    R.cidadeTxt = S.cidade==="outra" ? (S.cidadeNome.trim()||"outra cidade") : S.cidade;
    return R;
  }

  /* ================= DUAS OPÇÕES =================
     S guarda a opção que está sendo editada; S.alt guarda a outra (só os campos do serviço). */
  const SVC_KEYS = ["servico","v_ini","v_fim","v_dia","v_combo","p_plano","p_outro","p_ini","e_qtd","e_data","h_in","h_out","h_leva","b_plano","b_data","descManual","valorFechado","adds"];
  function pick(src){ const o={}; for(const k of SVC_KEYS) o[k]=src[k]; return JSON.parse(JSON.stringify(o)); }
  function edit(){ return S.editando===2 ? 2 : 1; }
  function principal(){ return S.alt ? (S.escolhida || S.recomendada || 1) : 1; }
  function withOpt(n, fn){
    if(!S.alt || edit()===n) return fn();
    const old=S; S=Object.assign({}, S, JSON.parse(JSON.stringify(S.alt)));
    try { return fn(); } finally { S=old; }
  }
  function trocarOpcao(){
    const cur=pick(S); Object.assign(S, JSON.parse(JSON.stringify(S.alt))); S.alt=cur; S.editando=3-edit();
    bindValues(); renderAdds(); update();
  }
  function renderOptTabs(){
    const box=$("#optTabs"); if(!box) return; const e=edit();
    $("#ajOpt").textContent = S.alt ? `· opção ${e}` : "";
    if(!S.alt){ box.innerHTML=`<button class="btn soft small" data-opt="add">+ Adicionar opção 2</button> <span class="hint">Para mandar duas opções no mesmo PDF, por exemplo hospedagem ou visitas.</span>`; return; }
    const Rs={1:withOpt(1,calc),2:withOpt(2,calc)}; const pr=principal();
    box.innerHTML=`<div class="chips">${[1,2].map(n=>`<button class="chip ${e===n?"on":""}" data-opt="${n}">Opção ${n}${Rs[n].ok?" · "+brl(Rs[n].final):""}${pr===n?" "+ic("estrela","sm"):""}</button>`).join("")}</div>
      <div class="row-actions" style="margin:6px 0 2px">${pr!==e?`<button class="btn soft small" data-opt="rec">${ic("estrela")} Recomendar a opção ${e}</button>`:`<span class="hint">${ic("estrela","sm")} Opção ${e} ${S.escolhida?"escolhida pelo cliente":"recomendada (fica em destaque no PDF)"}</span>`}<button class="x" data-opt="rm">remover opção ${e}</button></div>
      <p class="hint" style="margin:0 0 8px">Editando a <b>opção ${e}</b>: serviço, datas e o passo 4 valem só para ela. Cliente, pets e recado valem para as duas.</p>`;
  }
  $("#optTabs").addEventListener("click", async ev=>{
    const b=ev.target.closest("[data-opt]"); if(!b) return; ev.preventDefault(); const o=b.dataset.opt;
    if(o==="add"){ S.alt=pick(S); S.recomendada=1; S.escolhida=null; trocarOpcao(); toast("Opção 2 criada. Troque o serviço, as datas ou o valor."); }
    else if(o==="rec"){ S.recomendada=edit(); S.escolhida=null; update(); }
    else if(o==="rm"){
      if(!(await U.confirmDialog(`Remover a opção ${edit()}? A outra opção fica como a proposta.`,{ok:"Remover",danger:true}))) return;
      Object.assign(S, JSON.parse(JSON.stringify(S.alt))); S.alt=null; S.editando=1; S.recomendada=1; S.escolhida=null;
      bindValues(); renderAdds(); update();
    }
    else if(Number(o)!==edit()) trocarOpcao();
  });

  /* icons + inclusions */
  const IC = {
    walk:'<path d="M13 4a1.5 1.5 0 1 0 0 .01M10 21l2-6 3 3v3M8 10l3-2 3 2 2 3M11 8l-1 5 2 2"/>',
    heart:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    bowl:'<path d="M3 12h18a9 9 0 0 1-18 0zM8 8c0-1 1-1 1-2M12 8c0-1 1-1 1-2M16 8c0-1 1-1 1-2"/>',
    broom:'<path d="M14 4l6 6M12 6l6 6-7 7H5v-6z"/>',
    phone:'<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 17h2"/>',
    house:'<path d="M4 11l8-7 8 7M6 10v10h12V10"/>',
    moon:'<path d="M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z"/>',
    clock:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
    banho:'<path d="M4 12h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM6 12V6a2 2 0 0 1 4 0M7 19l-1 2M17 19l1 2"/>',
    brush:'<path d="M4 20l6-6M9 9l6 6M12 4l8 8-4 4-8-8z"/>',
    scissors:'<circle cx="6" cy="7" r="2.5"/><circle cx="6" cy="17" r="2.5"/><path d="M8 8.5 20 18M8 15.5 20 6"/>',
    shield:'<path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z"/>',
    quiet:'<path d="M5 10v4h3l4 4V6L8 10zM16 9l5 6M21 9l-5 6"/>',
  };
  function incVisita(){ const w=walkers().length>0; return [
    ...(w?[["walk","Passeio","Para gastar energia e voltar tranquilo"]]:[]),
    ["heart","Brincadeira e carinho","Atenção de verdade, no ritmo do pet"],
    ["bowl","Alimentação e água fresca","No horário que ele já está acostumado"],
    ["broom","Limpeza do ambiente","A casa fica do jeito que você deixou"],
    ["phone","Foto e relatório no WhatsApp","Você acompanha tudo de onde estiver"]]; }
  function incHosp(){ return [
    ["house","Um lar de verdade","Sem baias e sem gaiola: ele fica dentro de casa com a gente"],
    ...(walkers().length?[["walk","Passeios diários","Rotina de passeio mantida"]]:[]),
    ["bowl","Alimentação no horário","Com a ração e a rotina dele"],
    ["moon","Companhia o dia todo","Inclusive à noite"],
    ["phone","Foto e relatório no WhatsApp","Notícias todos os dias"]]; }
  function incBanho(){ return [
    ["banho","Banho e secagem silenciosa","Sem soprador barulhento e sem latido de outros cães"],
    ["brush","Escovação, unhas e ouvidos","Cuidado completo"],
    ["scissors","Tosa higiênica","Inclusa no valor"],
    ["shield","Sem estresse","O pet não sai de casa e você não perde tempo levando e buscando"],
    ["broom","Ambiente do jeito que estava","A gente deixa tudo limpinho no final"]]; }
  const ico = k => `<svg viewBox="0 0 24 24" fill="none" stroke="#C7694A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${IC[k]||IC.heart}</svg>`;
  const PAW = `<svg viewBox="0 0 24 24" fill="none" stroke="#6E7F63" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5.5C6 5 4 6.5 3.5 9.5 3 12 4 14 5.5 14l1-4"/><path d="M16 5.5c2-.5 4 1 4.5 4 .5 2.5-.5 4.5-2 4.5l-1-4"/><path d="M7 7.5C8 5.8 10 5 12 5s4 .8 5 2.5c.6 1.3 1 3.5 1 5.5 0 3.5-2.7 6-6 6s-6-2.5-6-6c0-2 .4-4.2 1-5.5z"/><path d="M10 12h.01M14 12h.01"/><path d="M10.8 15.2c.4.5.8.7 1.2.7s.8-.2 1.2-.7"/></svg>`;
  const MARK = `<svg class="mk" viewBox="0 0 48 48" fill="none" stroke="#C7694A" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 23 24 7l19 16"/><path d="M10 19v21h28V19"/><g fill="#F9F3EC" stroke="none"><ellipse cx="24" cy="31.5" rx="5.2" ry="4.2"/><circle cx="18.3" cy="25.8" r="2.1"/><circle cx="22" cy="22.6" r="2.1"/><circle cx="26" cy="22.6" r="2.1"/><circle cx="29.7" cy="25.8" r="2.1"/></g></svg>`;

  /* ================= RENDER: FORM ================= */
  function bindForm(){
    $$("[data-k]").forEach(el=>{
      const k=el.dataset.k;
      if(el.type==="checkbox") el.checked=!!S[k]; else el.value = S[k] ?? "";
      el.addEventListener("input",()=>{ S[k] = el.type==="checkbox"? el.checked : el.value; update(); });
      el.addEventListener("change",()=>{ S[k] = el.type==="checkbox"? el.checked : el.value; update(); });
    });
    $$("[data-chips]").forEach(box=>{
      const k=box.dataset.chips;
      box.addEventListener("click",e=>{ const b=e.target.closest(".chip"); if(!b) return; e.preventDefault(); S[k]=b.dataset.v; update(); if(k==="servico"||k==="b_plano") renderAdds(); });
    });
  }
  function syncChips(){
    $$("[data-chips]").forEach(box=>{ const k=box.dataset.chips; box.querySelectorAll(".chip").forEach(c=>c.classList.toggle("on", String(S[k])===c.dataset.v)); });
    $$("[data-show]").forEach(el=>el.classList.toggle("hide", el.dataset.show!==S.servico));
    $("#levaTrazWrap").classList.toggle("hide", S.cidade==="BC");
    $("[data-city-outra]").classList.toggle("hide", S.cidade!=="outra");
    $("[data-pacote-outro]").classList.toggle("hide", S.p_plano!=="outro");
  }
  function renderPets(){
    const box=$("#petList");
    box.innerHTML = S.pets.map((p,i)=>`
      <div class="pet" data-id="${p.id}">
        <div class="pet-head">
          <div class="ph" data-photo="${p.id}" title="Trocar foto">${p.foto?`<img src="${p.foto}" alt=""><span class="chg">trocar</span>`:PAW+'<small>foto</small>'}</div>
          <div class="grow">
            <label class="f" style="margin:0">Nome do pet ${i? "#"+(i+1):""}<input type="text" data-pk="nome" value="${esc(p.nome)}" placeholder="Ex.: Bento"></label>
          </div>
        </div>
        ${p.foto?`<div class="photo-actions"><button class="btn mini" data-photo="${p.id}">${ic("camera")} Trocar foto</button><button class="btn mini danger" data-rmfoto="${p.id}">${ic("lixo")} Remover foto</button></div>`:""}
        <div class="chips" style="margin-bottom:10px">
          <button class="chip ${p.especie==="cao"?"on":""}" data-pc="especie" data-v="cao">${ic("cao")} Cão</button>
          <button class="chip ${p.especie==="gato"?"on":""}" data-pc="especie" data-v="gato">${ic("gato")} Gato</button>
        </div>
        <div class="row">
          <label class="f">Raça<input type="text" data-pk="raca" value="${esc(p.raca)}" placeholder="Ex.: SRD"></label>
          <label class="f">Idade<input type="text" data-pk="idade" value="${esc(p.idade)}" placeholder="Ex.: 4 anos"></label>
        </div>
        ${p.especie==="cao"?`
        <label class="f">Porte
          <select data-pk="porte">${Object.entries(PORTES).map(([k,v])=>`<option value="${k}" ${p.porte===k?"selected":""}>${v}</option>`).join("")}</select>
        </label>
        <label class="check"><input type="checkbox" data-pk="passeia" ${p.passeia?"checked":""}> Vai passear nas visitas</label>`:""}
        <details class="ficha-ed" ${p.alimentacao||p.medicacao||p.comportamento||p.limitacoes||p.veterinario?"open":""}><summary>Ficha do pet (opcional, não sai no PDF)</summary>
          <label class="f">Alimentação (marca, quantidade, horários)<textarea data-pk="alimentacao" rows="2">${esc(p.alimentacao||"")}</textarea></label>
          <label class="f">Remédios<textarea data-pk="medicacao" rows="2">${esc(p.medicacao||"")}</textarea></label>
          <label class="f">Comportamento com estranhos / outros pets<textarea data-pk="comportamento" rows="2">${esc(p.comportamento||"")}</textarea></label>
          <label class="f">Limitações físicas / saúde<textarea data-pk="limitacoes" rows="2">${esc(p.limitacoes||"")}</textarea></label>
          <label class="f">Veterinário (nome e telefone)<input type="text" data-pk="veterinario" value="${esc(p.veterinario||"")}"></label>
          <label class="check"><input type="checkbox" data-pk="reativo" ${p.reativo?"checked":""}> Pode ser reativo / agressivo (combinar antes do banho)</label>
        </details>
        ${S.pets.length>1?`<div style="display:flex;gap:14px"><button class="x" data-rm="${p.id}">remover pet</button></div>`:""}
      </div>`).join("");
  }
  $("#petList").addEventListener("input",e=>{
    const card=e.target.closest(".pet"); if(!card) return; const p=S.pets.find(x=>x.id===card.dataset.id); const k=e.target.dataset.pk; if(!k) return;
    p[k] = e.target.type==="checkbox"? e.target.checked : e.target.value; update(false);
  });
  $("#petList").addEventListener("change",e=>{ if(["porte","passeia","reativo"].includes(e.target.dataset.pk)) { const card=e.target.closest(".pet"); const p=S.pets.find(x=>x.id===card.dataset.id); p[e.target.dataset.pk]= e.target.type==="checkbox"?e.target.checked:e.target.value; update(false);} });
  let photoTarget=null;
  $("#petList").addEventListener("click",e=>{
    const card=e.target.closest(".pet"); if(!card) return; const p=S.pets.find(x=>x.id===card.dataset.id);
    const chip=e.target.closest("[data-pc]"); if(chip){ e.preventDefault(); p[chip.dataset.pc]=chip.dataset.v; update(true); return; }
    if(e.target.closest("[data-photo]")){ e.preventDefault(); photoTarget=p.id; $("#petFile").value=""; $("#petFile").click(); return; }
    if(e.target.dataset.rm){ S.pets=S.pets.filter(x=>x.id!==p.id); update(true); renderTutorPets(); return; }
    if(e.target.closest("[data-rmfoto]")){ p.foto=""; p._fotoNova=false; if(p.foto_path) p._fotoRemover=true; update(true); return; }
  });
  $("#addPet").addEventListener("click",()=>{ if(S.pets.length>=4){ toast("Até 4 pets por proposta."); return; } S.pets.push(newPet()); update(true); renderTutorPets(); });
  $("#petFile").addEventListener("change",async e=>{ const f=e.target.files[0]; if(!f||!photoTarget) return;
    const p=S.pets.find(x=>x.id===photoTarget); p.foto = await squareImage(f, 900); p._fotoNova=true; p._fotoRemover=false; update(true); });
  function squareImage(file,size){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>{ const img=new Image(); img.onload=()=>{
    const s=Math.min(img.width,img.height); const c=document.createElement("canvas"); c.width=c.height=size; const x=c.getContext("2d");
    x.imageSmoothingQuality="high"; x.drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,size,size); res(c.toDataURL("image/jpeg",.9)); }; img.onerror=rej; img.src=r.result; }; r.readAsDataURL(file); }); }
  function fitImage(file,max){ return new Promise((res)=>{ const r=new FileReader(); r.onload=()=>{ const img=new Image(); img.onload=()=>{
    const k=Math.min(1,max/Math.max(img.width,img.height)); const c=document.createElement("canvas"); c.width=img.width*k; c.height=img.height*k;
    c.getContext("2d").drawImage(img,0,0,c.width,c.height); res(c.toDataURL("image/png")); }; img.src=r.result; }; r.readAsDataURL(file); }); }


  /* ================= ADICIONAIS ================= */
  const PRESETS={cuidado:{desc:"Cuidado especial (medicação / cardíaco)",tipo:"pct",valor:15},reativo:{desc:"Manejo de pet reativo",tipo:"pct",valor:20},outro:{desc:"",tipo:"fixo",valor:""}};
  function renderAdds(){
    const unit = calc().unitLabel || "atendimento";
    $("#addList").innerHTML = S.adds.map(a=>`<div class="add" data-aid="${a.id}">
      <div class="r"><input type="text" data-ak="desc" value="${esc(a.desc)}" placeholder="Descrição (sai no PDF)"><input type="number" min="0" step="1" data-ak="valor" value="${esc(a.valor)}" placeholder="Valor"></div>
      <div class="r2"><select data-ak="tipo">
        <option value="pct" ${a.tipo==="pct"?"selected":""}>% sobre o serviço</option>
        <option value="fixo" ${a.tipo==="fixo"?"selected":""}>R$ valor único</option>
        <option value="unit" ${a.tipo==="unit"?"selected":""}>R$ por ${unit}</option></select>
        <label class="check"><input type="checkbox" data-ak="mostrar" ${a.mostrar!==false?"checked":""}> mostrar no PDF</label>
        <button class="x" data-arm="${a.id}">remover</button></div></div>`).join("");
  }
  $("#addPresets").addEventListener("click",e=>{ const b=e.target.closest("[data-preset]"); if(!b) return; e.preventDefault();
    S.adds.push(Object.assign({id:Math.random().toString(36).slice(2,8),mostrar:true}, PRESETS[b.dataset.preset])); renderAdds(); update(); });
  $("#addList").addEventListener("input",e=>{ const box=e.target.closest(".add"); const k=e.target.dataset.ak; if(!box||!k) return;
    const a=S.adds.find(x=>x.id===box.dataset.aid); a[k]= e.target.type==="checkbox"? e.target.checked : e.target.value; update(); });
  $("#addList").addEventListener("change",e=>{ const box=e.target.closest(".add"); const k=e.target.dataset.ak; if(!box||!k) return;
    const a=S.adds.find(x=>x.id===box.dataset.aid); a[k]= e.target.type==="checkbox"? e.target.checked : e.target.value; update(); });
  $("#addList").addEventListener("click",e=>{ if(!e.target.dataset.arm) return; S.adds=S.adds.filter(x=>x.id!==e.target.dataset.arm); renderAdds(); update(); });

  /* ================= RENDER: CALC PANEL ================= */
  function renderCalc(R){
    $("#valorTabela").textContent = R.ok ? brl(R.tabela) : "—";
    $("#autoDesc").textContent = R.ok ? (R.discAuto? Math.round(R.discAuto*100)+"%" : "sem desconto") : "—";
    $("#descWarn").classList.toggle("hide", !(Number(S.descManual)>15));
    if(!R.ok){ $("#calcLines").innerHTML=`<div><span>${R.msg}</span></div>`; $("#calcTot").textContent="—"; $("#calcInt").textContent=""; return; }
    let h = (S.alt?`<div><span><b>Opção ${edit()}</b>${principal()===edit()?" "+ic("estrela","sm"):""}</span><span></span></div>`:"") + R.lines.map(x=>`<div><span>${esc(x.l)}</span><span>${x.v<0?"− "+brl2(-x.v):brl2(x.v)}</span></div>`).join("");
    if(R.disc) h+=`<div><span>Desconto ${Math.round(R.disc*100)}%${S.descManual!==""?" (especial)":""}</span><span>− ${brl2(R.discountable*R.disc)}</span></div>`;
    if(S.servico==="banho"&&R.second2) h+=`<div><span>2º pet no banho −10%</span><span>− ${brl2(R.second2*(1-R.disc)*T.banho2pet)}</span></div>`;
    h += R.addLines.map(x=>`<div><span>${esc(x.l)}${x.show?"":" · interno"}</span><span>${brl2(x.v)}</span></div>`).join("");
    if(R.desloc) h+=`<div><span>Deslocamento ${esc(R.cidadeTxt)} · ${brl(R.deslocUnit)} × ${R.deslocN}</span><span>${brl(R.desloc)}</span></div>`;
    if(R.ajuste) h+=`<div><span>Valor combinado (tabela dava ${brl(R.tabela)})</span><span>${R.ajuste<0?"− "+brl2(-R.ajuste):"+ "+brl2(R.ajuste)}</span></div>`;
    $("#calcLines").innerHTML=h; $("#calcTot").textContent=brl(R.final);
    const notes=[]; if(R.holidays) notes.push(`Inclui +20% de feriado em ${R.holidays} ${S.servico==="hosp"?"diária(s)":"atendimento(s)"} (não aparece no PDF).`);
    if(S.servico==="hosp" && daysBetween(pd(S.h_in),pd(S.h_out))+1>=21) notes.push("21+ diárias: sem adicional de feriado.");
    if(R.warnGato) notes.push("Banho de gato não tem plano semanal na tabela. Confira antes de mandar.");
    notes.push(R.ajuste ? "Valor final combinado à mão (campo do passo 4)." : "Valor arredondado para múltiplo de R$ 5.");
    $("#calcInt").innerHTML=notes.join("<br>");
  }

  /* ================= RENDER: PDF PAGE ================= */
  function renderPage(){
    const R=calc(); renderCalc(R);
    const d=pd(S.data)||new Date(); const val=addDays(d, Number(S.validade)||7);
    const num = META.numero || "Rascunho";
    const n=S.pets.length;
    const petsHTML = S.pets.map(p=>{
      const tags=[]; if(p.especie==="gato") tags.push("Gato"); else tags.push("Porte "+PORTE_TXT[p.porte]);
      const det=[p.raca, p.idade].filter(Boolean).join(" · ");
      return `<div class="pcard"><div class="pimg">${p.foto?`<img src="${p.foto}">`:PAW}</div>
        <div><div class="pn">${esc(petTitle(p))}</div>${det?`<div class="pd">${esc(det)}</div>`:""}<div>${tags.map(t=>`<span class="tag">${t}</span>`).join("")}</div></div></div>`; }).join("");
    const p0=S.pets[0];
    const ficha=[["Espécie",p0.especie==="gato"?"Gato":"Cão"],["Raça",p0.raca],["Idade",p0.idade],["Porte",p0.especie==="gato"?"":PORTE_TXT[p0.porte][0].toUpperCase()+PORTE_TXT[p0.porte].slice(1)]].filter(x=>x[1]&&String(x[1]).trim());
    const soloHTML = `<div class="pcard solo"><div class="pimg">${p0.foto?`<img src="${p0.foto}">`:PAW}</div>
      <div class="pinfo"><div class="pk">Quem vamos cuidar</div><div class="pn">${esc(petTitle(p0))}</div>
      <div class="ficha">${ficha.map(([k,v])=>`<div><span>${k}</span><b>${esc(v)}</b></div>`).join("")}</div></div></div>`;

    const fora=S.cidade!=="BC";
    const detail = detailOf(R);
    function detailOf(R){
    let detail="";
    if(R.ok){
      detail += R.lines.map(x=>`<div class="${x.neg?"neg":""}"><span>${esc(x.l)}</span><span>${x.v<0?"− "+brl2(-x.v):brl2(x.v)}</span></div>`).join("");
      if(R.disc) detail+=`<div class="neg"><span>${S.descManual!==""?"Desconto especial":"Desconto "+discName()} (${Math.round(R.disc*100)}%)</span><span>− ${brl2(R.discountable*R.disc)}</span></div>`;
      if(S.servico==="banho"&&R.second2) detail+=`<div class="neg"><span>Desconto do 2º pet no banho (10%)</span><span>− ${brl2(R.second2*(1-R.disc)*T.banho2pet)}</span></div>`;
      detail += R.addLines.filter(x=>x.show).map(x=>`<div><span>${esc(x.l)}</span><span>${brl2(x.v)}</span></div>`).join("");
      if(R.desloc) detail+=`<div><span>Deslocamento ${esc(R.cidadeTxt)} · ${brl(R.deslocUnit)} por deslocamento × ${R.deslocN}</span><span>${brl(R.desloc)}</span></div>`;
      if(R.ajuste<0) detail+=`<div class="neg"><span>Condição especial combinada</span><span>− ${brl2(-R.ajuste)}</span></div>`;
      else if(R.ajuste>0) detail+=`<div><span>Ajuste combinado</span><span>${brl2(R.ajuste)}</span></div>`;
    }
    return detail; }
    const pr=principal(); const Rp=withOpt(pr,calc);
    const ops = S.alt ? [1,2].map(n=>withOpt(n,()=>{ const r=calc(); return {n, R:r, det:r.ok?detailOf(r):"", when:(r.ok?r.when.join("<br>"):"<i>Preencha as datas</i>"), mes:S.servico==="pacote"}; })) : null;
    const optsHTML = ops ? `<div class="opts">${ops.map(o=>`<div class="opt ${o.n===pr?"rec":""}">
        <div class="opt-k">Opção ${o.n}${o.n===pr?(S.escolhida?" · Escolhida":" · Recomendada"):""}</div>
        <h3>${esc(o.R.title)}</h3><div class="when">${o.when}</div>
        <ul class="opt-inc">${(o.R.inc||[]).slice(0,4).map(([,t])=>`<li>${t}</li>`).join("")}</ul>
        ${o.det?`<div class="opt-det">${o.det}</div>`:""}
        <div class="opt-price">${o.R.ok&&o.R.save>=1?`<div class="from">de ${brl(o.R.full)}</div>`:""}<div class="val">${o.R.ok?brl(o.R.final):"—"}</div>${o.mes?`<div class="per">por mês</div>`:""}</div>
      </div>`).join("")}</div>` : "";
    const badges=[];
    if(R.ok&&R.count>1) badges.push(`<span class="badge alt">${brl(R.perUnit)}/${R.unitLabel}</span>`);
    const intro = S.alt ? `Preparei <b>duas opções</b> com carinho para cuidar de <b>${esc(namesList(S.pets))}</b>. Veja abaixo e me conta qual fica melhor para você. ${S.escolhida?"":"A que eu recomendo está em destaque."}` : introText(R);
    const whenHTML = (R.ok? R.when.join("<br>") : '<i>Preencha as datas</i>') + (fora?`<br>Atendimento em <b>${esc(R.cidadeTxt||S.cidade)}</b>`:"");
    const incHTML = `<ul class="inc">${(R.inc||[]).map(([k,t,s])=>`<li><div class="ic">${ico(k)}</div><div><b>${t}</b><span>${s}</span></div></li>`).join("")}</ul>`;

    $("#page").innerHTML = `
    <div class="pg-head">
      <div class="arc"></div><div class="arc2"></div>
      <div class="pg-logo"><img class="official" src="${LOGO}" alt="Pet Lar"></div>
      <div class="pg-meta"><div class="ttl">Proposta</div><div class="tg2">Seu pet cuidado com carinho,<br>sem sair de casa.</div>${num}<br>Emitida em ${fmtY(d)}<br>Válida até ${fmtY(val)}</div>
    </div>
    <div class="pg-body">
      <div class="hello"><h1>Olá${S.tutor?", "+esc(S.tutor):""}!</h1><p>${intro}</p></div>
      ${S.alt ? `${n===1? `<div class="solo-wide">${soloHTML}</div>` : `<div class="pets n${n}">${petsHTML}</div>`}${optsHTML}` : `
      ${n===1? `<div class="duo">${soloHTML}<div class="svc-box svc-side"><div class="pk">Serviço</div><h2>${esc(R.title)}</h2><div class="when">${whenHTML}</div></div></div>
        <div class="svc-box"><div class="sec-t">O que está incluso</div>${incHTML}</div>`
      : `<div class="pets n${n}">${petsHTML}</div>
      <div class="svc"><div class="svc-box">
          <div class="svc-top"><h2>${esc(R.title)}</h2><div class="when">${whenHTML}</div></div>${incHTML}
      </div></div>`}
      <div>
        <div class="inv">
          <div class="det">${detail||"<div><span>—</span></div>"}</div>
          <div class="big"><div class="lbl">Valor ${S.servico==="pacote"?"mensal":"total"}</div>
            ${R.ok&&R.save>=1?`<div class="from">de ${brl(R.full)}</div>`:""}
            <div class="val">${R.ok?brl(R.final):"—"}</div><div class="badges">${badges.join("")}</div></div>
        </div>
      </div>`}
      <div class="cond">
        <div><b>Pagamento</b>Pix · 50% na confirmação e 50% ao final do serviço</div>
        <div><b>Remarcação</b>Sem custo, avisando com 24h de antecedência</div>
        ${S.alt && !S.escolhida ? `<div><b>Pix do sinal</b>Mando assim que você escolher a opção</div>` : pixBox(Rp)}
      </div>
      ${S.obs?`<div class="obs">${esc(S.obs)}</div>`:""}
      <div class="end"><div><div style="font-size:13px;color:#4C443E">Qualquer dúvida, é só me chamar. Com carinho,</div><div class="sign">Lari</div></div></div>
    </div>
    <div class="pg-foot"><div class="fl"><img src="${AVATAR}" style="width:26px;height:26px;border-radius:50%;margin:-4px 0">${CFG.whats?`<span><b>WhatsApp</b> ${esc(CFG.whats)}</span>`:""}<span><b>Instagram</b> ${esc(CFG.insta||"@petlar.bc")}</span></div><span>Balneário Camboriú · SC</span></div>`;
    fitPreview();
  }
  function discName(){ return {visitas:"pacote viagem",pacote:"do plano",hosp:"estadia longa",banho:"do plano",estendida:""}[S.servico]||""; }
  function introText(R){
    const nomes=namesList(S.pets); const s=S.servico;
    if(s==="hosp") return `Preparei esta proposta com carinho para a estadia de <b>${esc(nomes)}</b> aqui em casa. Enquanto você estiver fora, ${S.pets.length>1?"eles ficam":"fica"} num lar de verdade, com rotina, passeios e muito carinho, e você recebe notícias todos os dias.`;
    if(s==="banho") return `Preparei esta proposta para o banho de <b>${esc(nomes)}</b> sem sair de casa. Eu levo todo o equipamento, o pet fica no ambiente dele, sem barulho e sem estresse, e você não perde tempo levando e buscando.`;
    if(s==="pacote") return `Preparei esta proposta para cuidar de <b>${esc(nomes)}</b> na rotina da semana. Enquanto você trabalha, eu passo aí para passear, brincar e cuidar, e você recebe foto e relatório a cada visita.`;
    return `Preparei esta proposta com carinho para cuidar de <b>${esc(nomes)}</b> enquanto você estiver fora. ${S.pets.length>1?"Eles continuam":"Continua"} em casa, na rotina de sempre, e você acompanha tudo pelo WhatsApp.`;
  }
  function fitPreview(){ const w=$("#stage").clientWidth; const k=w/794; $("#scaler").style.transform=`scale(${k})`; $("#stage").style.height=($("#page").offsetHeight*k)+"px"; }
  on(window,"resize",fitPreview);

  /* ================= UPDATE ================= */
  let saveT;
  function update(rerenderPets){ if(rerenderPets) renderPets(); syncChips(); renderOptTabs(); renderPage(); markDirty(); }

  function bindValues(){ $$("[data-k]").forEach(el=>{ const k=el.dataset.k; if(el.type==="checkbox") el.checked=!!S[k]; else el.value=S[k]??""; }); }

  $("#btnVer").addEventListener("click",()=>{ const pv=$(".pv"); const atPv = pv.getBoundingClientRect().top < window.innerHeight*0.5;
    if(atPv){ window.scrollTo({top:0,behavior:"smooth"}); } else pv.scrollIntoView({behavior:"smooth"}); });
  on(window,"scroll",()=>{ const b=$("#btnVer"); if(!b) return; b.textContent = $(".pv").getBoundingClientRect().top < window.innerHeight*0.5 ? "Editar" : "Ver prévia"; },{passive:true});

  /* ================= INIT ================= */
  bindForm(); renderPets(); renderAdds(); syncChips(); renderOptTabs(); renderPage();

  /* ================= PIX no A4 ================= */
  function sinalDe(R) { return Math.round((R.final || 0) / 2 * 100) / 100; }
  function pixInfo(R) {
    if (!SET.pix_chave || !R.ok || !R.final) return null;
    const valor = sinalDe(R);
    const payload = pixPayload({ chave: SET.pix_chave, nome: SET.pix_nome, cidade: SET.pix_cidade, valor, txid: (META.numero || "PETLAR").replace(/-/g, "") });
    return { valor, payload };
  }
  function pixBox(R) {
    const p = pixInfo(R);
    if (!p) return `<div><b>Antes de começar</b>Uma conversa rápida sobre rotina, alimentação e jeitinho do pet</div>`;
    if (pixState.key !== p.payload) {
      pixState = { key: p.payload, url: "" };
      pixQR(p.payload, 6).then(url => { if (pixState.key === p.payload) { pixState.url = url; renderPage(); } }).catch(() => {});
    }
    return `<div style="display:flex;gap:10px;align-items:center"><div style="flex:none;width:64px;height:64px;background:#fff;border-radius:8px;display:grid;place-items:center">${pixState.url ? `<img src="${pixState.url}" style="width:60px;height:60px;display:block">` : ""}</div><div><b>Pix do sinal</b>${brl2(p.valor)} para confirmar<br><span style="font-size:10.5px;opacity:.8">Aponte a câmera do banco no QR</span></div></div>`;
  }

  /* ================= cabeçalho / status ================= */
  function setState(t) { if (!alive) return; const el = document.getElementById("saveState"); if (el) el.textContent = t; }
  function renderHead() {
    if (!alive) return;
    $("#pNum").textContent = META.numero || "Nova proposta";
    $("#pStatus").innerHTML = META.id ? U.pill(META.status) : "";
  }

  /* ================= tutor (busca + vínculo) ================= */
  const acList = $("#acList"); const tutorInput = $('[data-k="tutor"]');
  let tutorPetsCache = [];
  function renderLinked() {
    $("#tutorLinked").innerHTML = S.tutor_id ? `<div class="linked">${ic("check")} Cliente cadastrado <a href="#/tutor/${S.tutor_id}" style="font-weight:700">ver ficha</a><button class="x" id="unlink" type="button">desvincular</button></div>` : "";
    const u = $("#unlink"); if (u) u.addEventListener("click", () => { S.tutor_id = null; tutorPetsCache = []; renderLinked(); renderTutorPets(); markDirty(); });
  }
  function renderTutorPets() {
    const ids = new Set(S.pets.map(p => p.pet_id).filter(Boolean));
    const faltam = tutorPetsCache.filter(p => !ids.has(p.id));
    $("#tutorPets").innerHTML = faltam.length ? `<span class="muted" style="width:100%">Pets do cadastro:</span>` + faltam.map(p => `<button class="chip" data-addpet="${p.id}" type="button">+ ${esc(p.nome || (p.especie === "gato" ? "Gato" : "Cão"))}</button>`).join("") : "";
  }
  async function petFromDb(p) {
    const n = newPet();
    Object.assign(n, { pet_id: p.id, foto_path: p.foto_path, nome: p.nome || "", especie: p.especie, raca: p.raca || "", idade: p.idade || "", porte: p.porte, passeia: p.passeia,
      alimentacao: p.alimentacao || "", medicacao: p.medicacao || "", comportamento: p.comportamento || "", limitacoes: p.limitacoes || "", veterinario: p.veterinario || "", reativo: !!p.reativo });
    if (p.foto_path) { try { n.foto = await db.fotoDataURL(p.foto_path); } catch { } }
    return n;
  }
  on($("#tutorPets"), "click", async e => {
    const b = e.target.closest("[data-addpet]"); if (!b) return;
    if (S.pets.length >= 4) { toast("Até 4 pets por proposta."); return; }
    const p = tutorPetsCache.find(x => x.id === b.dataset.addpet); b.disabled = true;
    const n = await petFromDb(p);
    const vazio = S.pets.length === 1 && !S.pets[0].pet_id && !S.pets[0].nome.trim() && !S.pets[0].raca.trim() && !S.pets[0].foto;
    if (vazio) S.pets = [n]; else S.pets.push(n);
    update(true); renderTutorPets();
  });
  async function linkTutor(t) {
    S.tutor_id = t.id; S.tutor = t.nome; S.tutorWhats = t.whatsapp || "";
    const c = (t.cidade || "").toLowerCase();
    if (c.includes("itaja")) S.cidade = "Itajaí"; else if (c === "camboriú" || c === "camboriu") S.cidade = "Camboriú"; else if (c && !c.includes("balne")) { S.cidade = "outra"; S.cidadeNome = t.cidade; }
    bindValues(); acList.classList.add("hide"); renderLinked();
    tutorPetsCache = await db.petsDoTutor(t.id).catch(() => []);
    const vazio = S.pets.length === 1 && !S.pets[0].pet_id && !S.pets[0].nome.trim() && !S.pets[0].raca.trim() && !S.pets[0].foto;
    const ativos = tutorPetsCache.filter(p => p.ativo);
    if (vazio && ativos.length) S.pets = await Promise.all(ativos.slice(0, 4).map(petFromDb));
    update(true); renderTutorPets();
  }
  const buscaTutor = U.debounce(async q => {
    if (S.tutor_id || q.trim().length < 2) { acList.classList.add("hide"); return; }
    const r = await db.searchTutores(q).catch(() => []);
    if (tutorInput.value !== q || S.tutor_id || document.activeElement !== tutorInput) return; // já saiu do campo: não abre a lista
    acList.innerHTML = r.map(t => `<button type="button" data-tid="${t.id}">${esc(t.nome)}<small>${esc(t.whatsapp || "")} ${esc(t.cidade || "")}</small></button>`).join("")
      + `<button type="button" data-novo>+ Cliente novo: <b>${esc(q)}</b></button>`;
    acList.classList.remove("hide"); acList._data = r;
  }, 250);
  on(tutorInput, "input", () => {
    if (S.tutor_id && S._tutorNovo === S.tutor_id) S._tutorNomeDirty = true; // cliente criado nesta proposta: só corrige o nome
    else if (S.tutor_id) { S.tutor_id = null; tutorPetsCache = []; renderLinked(); renderTutorPets(); } // mudou o nome de um cliente existente: procura de novo
    buscaTutor(tutorInput.value);
  });
  on(tutorInput, "blur", () => setTimeout(() => {
    if (!alive || document.activeElement === tutorInput) return;
    if ((!S.tutor_id && S.tutor.trim().length >= 2) || S._tutorNomeDirty || dirty) markDirty(); // terminou de digitar: agora cadastra/corrige o cliente
  }, 500));
  on(acList, "click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.novo !== undefined) { acList.classList.add("hide"); return; }
    const t = acList._data.find(x => x.id === b.dataset.tid); if (t) linkTutor(t);
  });
  on(document, "click", e => { if (!e.target.closest(".ac")) acList.classList.add("hide"); });
  on($('[data-k="tutorWhats"]'), "input", () => { S._tutorWhatsDirty = true; });

  /* ================= salvar ================= */
  function cidadeNome() { return S.cidade === "BC" ? "Balneário Camboriú" : S.cidade === "outra" ? (S.cidadeNome || "") : S.cidade; }
  function mesDepois(s) { const d = U.pd(s); d.setMonth(d.getMonth() + 1); d.setDate(d.getDate() - 1); return U.iso(d); }
  function periodoDe() {
    let a = null, b = null;
    if (S.servico === "visitas") { a = S.v_ini || null; b = S.v_fim || null; }
    else if (S.servico === "pacote") { a = S.p_ini || null; b = a ? mesDepois(a) : null; }
    else if (S.servico === "estendida") { a = b = S.e_data || null; }
    else if (S.servico === "hosp") { a = S.h_in || null; b = S.h_out || null; }
    else if (S.servico === "banho") { a = S.b_data || null; b = a ? (S.b_plano === "avulso" ? a : mesDepois(a)) : null; }
    if (a && (!b || b < a)) b = a;
    return { data_inicio: a, data_fim: b };
  }
  function payloadDe() {
    const c = JSON.parse(JSON.stringify(S));
    c.pets = c.pets.map(p => { const { foto, _fotoNova, _fotoRemover, ...r } = p; return r; });
    delete c._tutorWhatsDirty; delete c._tutorNomeDirty;
    // resumo de cada opção, para aceitar direto da lista sem abrir o editor
    c.opcoes = S.alt ? [1, 2].map(n => withOpt(n, () => { const r = calc(); const pe = periodoDe(); const vf = Number(S.valorFechado) || 0;
      return { n, servico: S.servico, titulo: r.title, valor_total: r.ok ? r.final : vf, valor_cheio: r.ok ? r.full : vf, data_inicio: pe.data_inicio, data_fim: pe.data_fim }; })) : null;
    return c;
  }
  function podeSalvar() { return !!(S.tutor.trim() || S.pets.some(p => p.nome.trim())); }
  let dirty = false, saving = null, autoT = null, saveAgain = false;
  markDirty = () => {
    dirty = true; window.__dirty = true;
    if (!podeSalvar()) { setState("Preencha o tutor para salvar"); return; }
    setState("Alterações…"); clearTimeout(autoT); autoT = setTimeout(() => save({ auto: true }).catch(() => {}), 2500);
  };
  // o tutor só vira cadastro quando a pessoa termina de digitar o nome (sai do campo) ou salva/envia de propósito
  function nomeTutorPronto(auto) {
    const nome = S.tutor.trim(); if (nome.length < 2) return false;
    if (!auto) return true;
    return document.activeElement !== tutorInput && !acList.contains(document.activeElement);
  }
  async function doSave({ auto = false } = {}) {
    setState("Salvando…");
    const pr = principal(); const R = withOpt(pr, calc);
    if (!S.tutor_id && nomeTutorPronto(auto)) {
      const t = await db.saveTutor({ nome: S.tutor.trim(), whatsapp: S.tutorWhats || null, cidade: cidadeNome() || null });
      S.tutor_id = t.id; S._tutorNovo = t.id; S._tutorWhatsDirty = false; S._tutorNomeDirty = false; if (alive) renderLinked();
    } else if (S.tutor_id) {
      const up = {};
      if (S._tutorWhatsDirty) up.whatsapp = S.tutorWhats || null;
      if (S._tutorNomeDirty && S._tutorNovo === S.tutor_id && nomeTutorPronto(auto)) up.nome = S.tutor.trim(); // corrigiu o nome do cliente criado aqui
      if (Object.keys(up).length) { await db.saveTutor({ id: S.tutor_id, ...up }); S._tutorWhatsDirty = false; if (up.nome) S._tutorNomeDirty = false; }
    }
    await Promise.all(S.pets.map(async p => {
      const vazio = !p.pet_id && !p.nome.trim() && !p.raca.trim() && !p.foto;
      if (vazio) return;
      const row = { tutor_id: S.tutor_id || null, nome: p.nome.trim() || null, especie: p.especie, raca: p.raca || null, idade: p.idade || null, porte: p.porte, passeia: !!p.passeia,
        alimentacao: p.alimentacao || null, medicacao: p.medicacao || null, comportamento: p.comportamento || null, limitacoes: p.limitacoes || null, veterinario: p.veterinario || null, reativo: !!p.reativo };
      if (p.pet_id) row.id = p.pet_id;
      const sv = await db.savePet(row); p.pet_id = sv.id;
      if (p._fotoNova && p.foto) {
        p._fotoNova = false; const old = p.foto_path;
        p.foto_path = await db.uploadFoto(p.pet_id, await U.dataURLToBlob(p.foto));
        await db.savePet({ id: p.pet_id, foto_path: p.foto_path }); if (old) db.removeFoto(old).catch(() => {});
      } else if (p._fotoRemover) {
        p._fotoRemover = false; const old = p.foto_path; p.foto_path = null;
        await db.savePet({ id: p.pet_id, foto_path: null }); if (old) db.removeFoto(old).catch(() => {});
      }
    }));
    const per = withOpt(pr, periodoDe); const svc = withOpt(pr, () => S.servico); const vf = withOpt(pr, () => Number(S.valorFechado) || 0);
    const valDays = Number(S.validade) || 7;
    const row = { tutor_id: S.tutor_id || null, tutor_nome: S.tutor.trim() || null, servico: svc, ...per, cidade: cidadeNome() || null,
      valor_total: R.ok ? R.final : vf, valor_cheio: R.ok ? R.full : vf, resumo: resumoDe(R), payload: payloadDe(), validade_ate: S.data ? U.addDays(S.data, valDays) : null };
    if (!META.id) { const r = await db.insertProposta(row); Object.assign(META, { id: r.id, numero: r.numero, status: r.status }); if (alive) replaceHash("#/proposta/" + r.id); }
    else await db.updateProposta(META.id, row);
    await db.setPropostaPets(META.id, [...new Set(S.pets.map(p => p.pet_id).filter(Boolean))]);
    db.invalidate("lista");
  }
  async function save(opts = {}) {
    if (!podeSalvar()) { toast("Preencha o nome do tutor ou do pet."); return false; }
    clearTimeout(autoT);
    if (saving) { saveAgain = true; return saving; }
    dirty = false; window.__dirty = false;
    saving = doSave(opts).then(() => { if (!alive) return true; if (!dirty) setState("Salvo ✓"); renderHead(); renderPage(); return true; })
      .catch(e => { dirty = true; if (alive) { window.__dirty = true; setState("Erro ao salvar"); toast("Não consegui salvar. Confira a internet; tento de novo na próxima alteração."); } throw e; })
      .finally(() => { saving = null; if (saveAgain && alive) { saveAgain = false; if (dirty) save({ auto: true }).catch(() => {}); } });
    return saving;
  }
  function resumoDe(R) {
    const pr = principal(); const per = withOpt(pr, periodoDe); const pets = S.pets.map(p => p.nome.trim()).filter(Boolean).join(", ");
    const outra = S.alt ? withOpt(3 - pr, () => { const r = calc(); return `ou opção ${3 - pr}: ${r.title}${r.ok ? " " + brl(r.final) : ""}`; }) : "";
    return [R.title, per.data_inicio ? U.periodo(per.data_inicio, per.data_fim) : "", pets, outra].filter(Boolean).join(" · ");
  }

  /* ================= status, duplicar, excluir ================= */
  async function setStatus(st) {
    if (!META.id) await save();
    if (dirty) await save();
    const antes = META.status; META.status = st; renderHead(); // otimista
    try { await db.updateProposta(META.id, { status: st }); db.invalidate("lista"); }
    catch (e) { META.status = antes; renderHead(); toast("Não consegui mudar o status."); return; }
    window.dispatchEvent(new Event("petlar:propostas"));
    if (st === "aceita") { toast("Proposta aceita! Sinal e saldo foram lançados no Financeiro.", 4000); loadPagtos(); }
    else toast("Status: " + U.STATUS[st]);
  }
  on($("#pMenu"), "click", () => {
    const st = META.status;
    const m = U.modal(`<h3>${esc(META.numero || "Proposta")}</h3><div class="acts">
      ${META.id && st !== "aceita" ? (S.alt ? [1, 2].map(n => { const r = withOpt(n, calc); return `<button class="btn ${n === principal() ? "primary" : "soft"}" data-st="aceita" data-esc="${n}">${ic("check")} Aceitou a opção ${n}${r.ok ? " · " + brl(r.final) : ""}</button>`; }).join("") : `<button class="btn primary" data-st="aceita">${ic("check")} Cliente aceitou</button>`) : ""}
      ${META.id && st !== "recusada" && st !== "aceita" ? `<button class="btn soft" data-st="recusada">${ic("x")} Cliente recusou</button>` : ""}
      ${META.id && st !== "enviada" && st !== "rascunho" ? `<button class="btn soft" data-st="enviada">${ic("voltar")} Voltar para “Enviada”</button>` : ""}
      ${META.id && st === "aceita" ? `<button class="btn soft" data-st="cancelada">Cancelar serviço</button>` : ""}
      ${META.id && st === "aceita" ? `<a class="btn soft" href="#/diario/${META.id}" data-close>${ic("diario")} Diário do serviço</a>` : ""}
      <button class="btn soft" data-salvar>${ic("salvar")} Salvar agora</button>
      ${META.id ? `<button class="btn soft" data-dup>${ic("copiar")} Duplicar proposta</button>` : ""}
      ${META.id ? `<button class="btn danger" data-del>Excluir proposta</button>` : ""}
      <button class="btn soft" data-close>Fechar</button></div>`);
    m.el.addEventListener("click", async e => {
      const b = e.target.closest("button"); if (!b || b.dataset.close !== undefined) return;
      m.close();
      if (b.dataset.esc) { S.escolhida = Number(b.dataset.esc); dirty = true; update(); }
      if (b.dataset.st === "enviada" && S.escolhida) { S.escolhida = null; dirty = true; update(); }
      if (b.dataset.st) setStatus(b.dataset.st);
      else if (b.dataset.salvar !== undefined) { await save(); toast("Salvo"); }
      else if (b.dataset.dup !== undefined) { if (dirty) await save(); location.hash = "#/proposta/" + META.id + "/duplicar"; }
      else if (b.dataset.del !== undefined) {
        if (await U.confirmDialog("Excluir a proposta " + (META.numero || "") + "? Isso não pode ser desfeito.", { ok: "Excluir", danger: true })) {
          await db.deleteProposta(META.id); dirty = false; window.__dirty = false; db.invalidate("lista"); toast("Proposta excluída."); location.hash = "#/propostas";
        }
      }
    });
  });

  /* ================= pagamentos desta proposta ================= */
  async function loadPagtos() {
    if (!alive) return; const box = $("#pagtosBox"); if (!META.id || META.status !== "aceita") { box.innerHTML = ""; return; }
    const ps = await db.pagamentosDaProposta(META.id).catch(() => []);
    box.innerHTML = `<div class="card"><h3>Pagamentos</h3><div class="list">${ps.map(g => `<div class="item" style="background:#fff"><div class="main"><div class="t">${esc(g.descricao)} · ${brl2(g.valor)}</div><div class="s">${g.pago_em ? "Pago em " + U.fmtY(g.pago_em) + (g.forma ? " (" + g.forma + ")" : "") : "Vence " + U.fmtY(g.vencimento)}</div></div>
      <button class="btn ${g.pago_em ? "soft" : "primary"} small" data-pg="${g.id}" data-pago="${g.pago_em ? 1 : 0}">${g.pago_em ? "Desfazer" : "Recebi"}</button></div>`).join("")}</div></div>`;
    box.querySelectorAll("[data-pg]").forEach(b => b.addEventListener("click", async () => {
      b.disabled = true; try { if (b.dataset.pago === "1") await db.desmarcarPago(b.dataset.pg); else await db.marcarPago(b.dataset.pg); toast("Atualizado"); } catch { toast("Não consegui atualizar."); } loadPagtos();
    }));
  }

  /* ================= gerar PDF / imagem ================= */
  async function libs() { await Promise.all([U.loadScript("/vendor/html2canvas.min.js"), U.loadScript("/vendor/jspdf.umd.min.js")]); await document.fonts.ready; }
  function nomeArquivo(ext) { return `Proposta Pet Lar ${META.numero || ""} - ${fileNames(S.pets).replace(/[\\/:*?"<>|]/g, "")}${S.tutor ? " - " + S.tutor : ""}.${ext}`.replace(/\s+/g, " "); }
  async function pdfBlob() {
    await libs();
    const holder = document.createElement("div"); holder.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;";
    const clone = $("#page").cloneNode(true); clone.removeAttribute("id"); holder.appendChild(clone); document.body.appendChild(holder);
    try {
      const hpx = clone.offsetHeight; const scale = Math.min(4, Math.sqrt(16e6 / (794 * hpx))); // limite de canvas do iPhone
      const canvas = await html2canvas(clone, { scale, backgroundColor: "#F9F3EC", useCORS: true, logging: false, imageTimeout: 0 });
      const { jsPDF } = window.jspdf; const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
      let w = 210, h = 210 * canvas.height / canvas.width; if (h > 297) { w = w * 297 / h; h = 297; }
      pdf.setFillColor(249, 243, 236); pdf.rect(0, 0, 210, 297, "F");
      pdf.addImage(canvas.toDataURL("image/jpeg", .96), "JPEG", (210 - w) / 2, 0, w, h);
      pdf.setProperties({ title: "Proposta Pet Lar " + (META.numero || ""), author: "Pet Lar" });
      return pdf.output("blob");
    } finally { holder.remove(); }
  }
  function cardHTML(R) {
    const p0 = S.pets[0]; const per = periodoDe(); const nomes = namesList(S.pets);
    const fotos = S.pets.filter(p => p.foto).slice(0, 3);
    return `<div class="wcard">
      <div class="wc-top"><img src="${LOGO}" class="wc-logo" alt=""><div class="wc-num">${esc(META.numero || "Proposta")}</div></div>
      <div class="wc-hi">Olá${S.tutor ? ", " + esc(S.tutor) : ""}!</div>
      <div class="wc-pet">${fotos.length ? fotos.map(p => `<img src="${p.foto}" alt="">`).join("") : `<div class="wc-paw">${PAW}</div>`}<div><div class="wc-nome">${esc(nomes.charAt(0).toUpperCase() + nomes.slice(1))}</div><div class="wc-svc">${S.alt ? "Duas opções para você" : esc(R.title)}</div><div class="wc-when">${!S.alt && per.data_inicio ? U.periodo(per.data_inicio, per.data_fim) : ""}</div></div></div>
      ${S.alt ? (() => { const pr = principal(); const ops = [1, 2].map(n => withOpt(n, () => ({ n, R: calc(), per: periodoDe() })));
        return `<div class="wc-opts">${ops.map(o => `<div class="wc-opt ${o.n === pr ? "rec" : ""}"><div class="wc-ok">Opção ${o.n}${o.n === pr ? (S.escolhida ? " · escolhida" : " · recomendada") : ""}</div><div class="wc-ot">${esc(o.R.title)}</div><div class="wc-ow">${o.per.data_inicio ? U.periodo(o.per.data_inicio, o.per.data_fim) : ""}</div>${o.R.save >= 1 ? `<div class="wc-de">de ${brl(o.R.full)}</div>` : ""}<div class="wc-ov">${brl(o.R.final)}</div></div>`).join("")}</div>
        <div class="wc-pg" style="text-align:center;margin:10px 22px 0">50% para confirmar · 50% no fim do serviço</div>`; })() : `
      <ul class="wc-inc">${(R.inc || []).slice(0, 4).map(([, t]) => `<li>${ic("check")} ${t}</li>`).join("")}</ul>
      <div class="wc-price">${R.save >= 1 ? `<div class="wc-de">de ${brl(R.full)}</div>` : ""}<div class="wc-val">${brl(R.final)}</div><div class="wc-pg">50% para confirmar · 50% ${S.servico === "hosp" ? "no check-out" : "no fim do serviço"}</div></div>`}
      <div class="wc-foot">${esc(CFG.whats)} · ${esc(CFG.insta)}</div></div>`;
  }
  async function cardBlob() {
    await libs(); const R = calc();
    const h = $("#cardHolder"); h.innerHTML = cardHTML(R);
    await Promise.all([...h.querySelectorAll("img")].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
    const canvas = await html2canvas(h.firstElementChild, { scale: 3, backgroundColor: null, useCORS: true, logging: false });
    h.innerHTML = "";
    return new Promise(r => canvas.toBlob(r, "image/png"));
  }
  function mensagem(R) {
    if (S.alt) {
      const pr = principal(); const nomes = namesList(S.pets);
      let t = `Oi${S.tutor ? ", " + S.tutor.split(" ")[0] : ""}! 🐾\n\nSegue a proposta${META.numero ? " " + META.numero : ""} da Pet Lar para ${nomes}, com *duas opções*:\n`;
      for (const n of [1, 2]) withOpt(n, () => { const r = calc(); const pe = periodoDe();
        t += `\n*Opção ${n}${n === pr ? (S.escolhida ? " (escolhida)" : " (recomendada)") : ""}:* ${r.title}${pe.data_inicio ? " (" + U.periodo(pe.data_inicio, pe.data_fim) + ")" : ""}\n💛 *${brl(r.final)}*${r.save >= 1 ? ` (de ${brl(r.full)})` : ""}\n`; });
      const Rp = withOpt(pr, calc); const px = S.escolhida ? pixInfo(Rp) : null;
      t += `\nPara confirmar: 50% de sinal e o restante ao final do serviço.`;
      t += S.escolhida ? (px ? `\n\nPix do sinal (${brl2(sinalDe(Rp))}, copia e cola):\n${px.payload}` : "") : `\nMe conta qual opção prefere que eu já te mando o Pix do sinal 😊`;
      return t + `\n\nQualquer dúvida é só me chamar!\nLari · Pet Lar`;
    }
    const per = periodoDe(); const p = pixInfo(R); const nomes = namesList(S.pets);
    let t = `Oi${S.tutor ? ", " + S.tutor.split(" ")[0] : ""}! 🐾\n\nSegue a proposta${META.numero ? " " + META.numero : ""} da Pet Lar: *${R.title}* para ${nomes}${per.data_inicio ? " (" + U.periodo(per.data_inicio, per.data_fim) + ")" : ""}.\n\n`;
    t += `💛 Valor: *${brl(R.final)}*${R.save >= 1 ? ` (de ${brl(R.full)})` : ""}\n`;
    t += `Para confirmar: 50% de sinal (${brl2(sinalDe(R))}) e o restante ${S.servico === "hosp" ? "no check-out" : "ao final do serviço"}.`;
    if (p) t += `\n\nPix do sinal (copia e cola):\n${p.payload}`;
    t += `\n\nQualquer dúvida é só me chamar!\nLari · Pet Lar`;
    return t;
  }
  async function marcarEnviada() { if (META.status === "rascunho") await setStatus("enviada"); }
  async function comBotao(btn, fn) { const t = btn.textContent; btn.disabled = true; btn.textContent = "Gerando…"; try { await fn(); } catch (e) { console.error(e); toast("Algo deu errado: " + (e.message || e)); } finally { btn.disabled = false; btn.textContent = t; } }
  async function enviarPdf(btn) { await comBotao(btn, async () => { const R = withOpt(principal(), calc); if (!R.ok) { toast(R.msg); return; } if (dirty || !META.id) await save(); const b = await pdfBlob(); const r = await U.shareOrDownload(b, nomeArquivo("pdf"), "application/pdf"); if (r !== "cancelled") { toast(r === "downloaded" ? "PDF baixado" : "PDF pronto"); await marcarEnviada(); } }); }
  async function enviarCard(btn) { await comBotao(btn, async () => { const R = withOpt(principal(), calc); if (!R.ok) { toast(R.msg); return; } if (dirty || !META.id) await save(); const b = await cardBlob(); const r = await U.shareOrDownload(b, nomeArquivo("png"), "image/png"); if (r !== "cancelled") { toast("Imagem pronta"); await marcarEnviada(); } }); }
  function abrirEnviar() {
    if (S.alt) for (const n of [1, 2]) { const r = withOpt(n, calc); if (!r.ok) { toast(`Opção ${n}: ${r.msg}`); return; } }
    const R = withOpt(principal(), calc); if (!R.ok) { toast(R.msg); return; }
    const msg = mensagem(R);
    const m = U.modal(`<h3>Enviar proposta</h3>
      <p class="muted" style="margin:-4px 0 12px">Mande o PDF (ou a imagem) e depois a mensagem. A proposta passa para “Enviada”.</p>
      <div class="acts" style="margin-top:0">
        <button class="btn primary" data-a="pdf">${ic("pdf")} Compartilhar PDF</button>
        <button class="btn soft" data-a="card">${ic("foto")} Compartilhar imagem (card)</button>
        <a class="btn wa" data-a="wa" href="${U.waLink(S.tutorWhats, msg)}" target="_blank" rel="noopener">${ic("conversa")} Abrir conversa com a mensagem</a>
        <button class="btn soft" data-a="copy">${ic("copiar")} Copiar mensagem</button>
      </div>
      <h3 style="font-size:15px;margin:14px 0 6px">Mensagem</h3><pre>${esc(msg)}</pre>
      <div class="acts"><button class="btn soft" data-close>Fechar</button></div>`);
    m.el.addEventListener("click", async e => {
      const b = e.target.closest("[data-a]"); if (!b) return;
      const a = b.dataset.a;
      if (a === "pdf") enviarPdf(b);
      else if (a === "card") enviarCard(b);
      else if (a === "copy") { await U.copyText(msg); toast("Mensagem copiada"); await marcarEnviada(); }
      else if (a === "wa") { marcarEnviada(); }
    });
  }
  on($("#pEnviar"), "click", abrirEnviar);
  on($("#btnEnviar2"), "click", abrirEnviar);
  on($("#btnPdf2"), "click", e => enviarPdf(e.currentTarget));
  on($("#btnCard"), "click", e => enviarCard(e.currentTarget));

  /* ================= carregar ================= */
  let tutorParaNova = null;
  try { tutorParaNova = sessionStorage.getItem("petlar_nova_tutor"); sessionStorage.removeItem("petlar_nova_tutor"); } catch { }
  if (param && param !== "nova") {
    const row = await db.getProposta(param);
    S = Object.assign(blank(), row.payload || {});
    if (!Array.isArray(S.adds)) S.adds = [];
    if (!S.pets || !S.pets.length) S.pets = [newPet()];
    // dados mais recentes dos pets do cadastro + fotos (em paralelo)
    const ids = S.pets.map(p => p.pet_id).filter(Boolean);
    const atuais = await db.getPets(ids).catch(() => []);
    S.pets = await Promise.all(S.pets.map(async p => {
      const a = atuais.find(x => x.id === p.pet_id);
      if (a) return petFromDb(a);
      const n = Object.assign(newPet(), p); n.foto = ""; return n;
    }));
    if (acao === "duplicar") {
      Object.assign(META, { id: null, numero: null, status: "rascunho" }); S.data = U.today(); delete S.importada; S.escolhida = null;
    } else Object.assign(META, { id: row.id, numero: row.numero, status: row.status });
    if (S.tutor_id) db.petsDoTutor(S.tutor_id).then(r => { tutorPetsCache = r; renderTutorPets(); }).catch(() => {});
  } else if (tutorParaNova) {
    const t = await db.getTutor(tutorParaNova).catch(() => null); if (t) { await linkTutor(t); }
  }
  if (!S.data) S.data = U.today();

  // para os testes automáticos
  window.G = { get S() { return S; }, set S(v) { S = v; }, blank, newPet, calc, withOpt, principal, bindValues, update, renderAdds, renderPets, save, META, setStatus };

  if (S.importada && META.id) $("#impBanner").innerHTML = `<div class="warn" style="margin-bottom:12px">${ic("importado")} <b>Orçamento importado do histórico</b> (feito antes do sistema${S.importada.quando ? ", " + U.esc(S.importada.quando) : ""}). O valor que foi passado ao cliente está em “Valor final combinado”. Complete o que faltar: datas, WhatsApp, fotos e a ficha dos pets.${S.importada.nota ? "<br>" + U.esc(S.importada.nota) : ""}</div>`;
  bindValues(); renderLinked(); renderHead(); renderPets(); renderAdds(); syncChips(); renderOptTabs(); renderPage(); loadPagtos();
  document.fonts && document.fonts.ready.then(fitPreview);
  clearTimeout(autoT); dirty = false; window.__dirty = false; setState(META.id ? "Salvo ✓" : "");
  if (acao === "duplicar") { replaceHash("#/proposta/nova"); markDirty(); toast("Cópia criada. Ajuste e ela salva sozinha."); }

  setNavGuard(async () => {
    if (saving) { try { await saving; } catch { } }
    if (!dirty) return true;
    if (!podeSalvar()) return U.confirmDialog("Sair sem salvar? A proposta ainda não tem tutor nem pet.", { ok: "Sair", danger: true });
    try { await save(); return true; } catch { return U.confirmDialog("Não consegui salvar. Sair mesmo assim?", { ok: "Sair", danger: true }); }
  });

  return {
    destroy() {
      alive = false; clearTimeout(autoT);
      listeners.forEach(([el, ev, fn, opt]) => el.removeEventListener(ev, fn, opt));
      delete window.G; window.__dirty = false;
    }
  };
}
