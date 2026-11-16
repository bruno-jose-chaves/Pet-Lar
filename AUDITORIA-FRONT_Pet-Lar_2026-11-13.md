# Auditoria de front-end · Pet Lar · 2026-11-13

Conteúdo, design e consistência do **painel** (uso interno, v2.6) e da **área do tutor** (`/t/`).
Auditoria **somente de leitura**: nada foi alterado em código ou conteúdo, e nenhum formulário foi enviado com dados reais.

**Contexto assumido** (o modelo veio com os campos em branco; corrija se eu errei)

| Campo | O que usei |
|---|---|
| O que é e para quem | Painel de uma pet sitter (propostas, agenda, diário, financeiro) + área onde o tutor acompanha o pet, confirma orçamento e paga o sinal |
| Público | Painel: Larissa e Bruno, no celular, no meio da rotina. Área do tutor: donos de pets, pouco técnicos, chegando por um link no WhatsApp |
| Tom de voz | Próximo e simples, em primeira pessoa ("Não consegui salvar", "a Lari já foi avisada") — é o que o produto já usa |
| Identidade visual | Paleta terracota/creme/sálvia/carvão, Playfair Display nos títulos e Lato no texto, ícones de linha |
| Fluxos prioritários | Montar e enviar proposta · cobrar resposta · diário · área do tutor |

**Como a evidência foi coletada**

| Fonte | Cobertura |
|---|---|
| Estilos computados no navegador (Chromium, banco simulado) | 27 telas e janelas do painel + 6 da área do tutor, em 390×844 e 1280×860; ~3.400 trechos de texto e ~500 botões medidos |
| Código | `public/css/app.css`, `gerador.css`, `portal.css`; textos em `public/js/**` (mensagens, estados vazios, avisos) |
| Prints | `folha-1_painel-celular.png`, `folha-2_formularios-celular.png`, `folha-3_area-do-tutor.png`, `folha-4_desktop.png` (enviados junto) |

Etiquetas: **[Objetivo]** = inconsistência, erro, contraste reprovado ou quebra medida · **[Opinião]** = julgamento de design, sempre com o porquê.

---

## 1. Resumo executivo

| Dimensão | Nota | Por quê |
|---|---|---|
| **Texto** | 7,5 | Voz própria e humana, erros que dizem o que fazer; perde por dois nomes para a mesma coisa (proposta/orçamento, cliente/tutor) e por plurais com "(s)" |
| **Visual** | 8 | Identidade clara e calorosa, hierarquia boa, ícones de um traço só; a área do tutor é o ponto alto |
| **Consistência** | 6 | 22 tamanhos de fonte no painel, 6 pesos pedidos e só 3 carregados, 10 raios de borda, ~90 cores distintas no código; painel e área do tutor usam dois conjuntos de variáveis |
| **Acessibilidade** | 5,5 | O terracota da marca reprova contraste AA como texto e como fundo de botão; muito texto abaixo de 12 px; foco de teclado sem padrão no painel |

### Os 5 problemas que mais prejudicam quem usa

| # | Problema | Evidência | Etiqueta |
|---|---|---|---|
| 1 | **Botão principal não passa no contraste.** Texto branco sobre terracota `#C7694A` dá 3,79:1 (mínimo 4,5:1) em todos os botões principais, do painel e da área do tutor | 60+ botões medidos; ex.: "Entrar", "Recebi", "Cobrar (2ª)", "Entendi, quero entrar" | Objetivo |
| 2 | **Rótulos e números pequenos demais e claros demais.** Rótulos dos cartões em terracota 10,5 px sobre creme (3,61:1); 400+ trechos abaixo de 12 px no painel | "SERVIÇOS HOJE", "A RECEBER", etiquetas de serviço 11,5 px, calendário 10–11 px | Objetivo |
| 3 | **A mesma coisa tem dois nomes.** "Proposta" e "orçamento"; "cliente" e "tutor"; "Configurações" (celular) e "Ajustes" (computador); "Como usar" e "Ajuda" | `app.js:19-20` × `app.js:37`; tela do tutor ("Histórico de orçamentos"); filtro ("Por cliente") | Objetivo |
| 4 | **"Enviar" aparece demais e o botão flutuante cobre ações.** Na proposta há "Enviar" no topo, na barra fixa e no passo 5; "+ Nova proposta" flutua por cima de "Recusou"/"Adiar" | `folha-2`, `folha-1`, `folha-4` (cartão do rascunho) | Objetivo |
| 5 | **Na área do tutor, a dica não bate com o botão.** O botão diz "Contar"; a dica embaixo diz "Toque em Preencher" | `portal.js:263`, `309-310`; `folha-3` (Seus dados → Bairro) | Objetivo |

### As 5 correções rápidas de maior efeito

| # | Correção | Esforço |
|---|---|---|
| 1 | Escurecer o terracota **só onde há texto**: fundo de botão e texto em `#A9553A` (já existe como `--c-terra-e` na área do tutor; branco sobre ele dá ~5,3:1). O terracota claro continua em ícones, bordas e destaques | P |
| 2 | Subir o piso de fonte para **12 px** e trocar rótulos terracota por marrom `#5A3B2A` | P |
| 3 | Fechar o glossário: **proposta** no painel, **orçamento** para o tutor, **tutor** para a pessoa; "Configurações" e "Como usar" nos dois menus | P |
| 4 | Trocar "Toque em Preencher" por "Toque em Contar" (ou renomear o botão para "Preencher") | P |
| 5 | Tirar o "(s)": "1 hospedado" / "2 hospedados", "2 parcelas", "2 serviços" | P |

---

## 2. Padrão de fato (inventário)

### 2.1 Tipografia

**Famílias:** Playfair Display (títulos e números de destaque) e Lato (todo o resto). Padrão claro e bem aplicado.

**Pesos pedidos × pesos que existem** [Objetivo]

| Família | Pesos carregados (`public/fonts`) | Pesos pedidos no CSS (trechos medidos) | Fora do padrão |
|---|---|---|---|
| Lato | 400, 700, 900 | 700 (1.727) · 400 (1.041) · **600 (164)** · 900 (106) · **800 (55)** · **500 (36)** | 500, 600 e 800 não existem: o navegador troca pelo vizinho, então "600" aparece igual a 700 e "500" igual a 400 |
| Playfair Display | 600, 700, 800, 500 itálico | 700 (253) · **400 (6)** · 800 (6) · **500 (6)** | 400 e 500 normal não existem |

**Tamanhos no painel** — 22 em uso (ocorrências somando celular + computador)

| Tamanho | Ocorr. | Onde | Situação |
|---|---|---|---|
| 10 px | 38 | etiquetas da prévia da proposta, contador de hóspedes na agenda | abaixo do piso |
| 10,5 px | 83 | rótulos dos cartões de número, bolinha de contagem | abaixo do piso |
| 11 px | 140 | dias da semana, eventos da agenda, rótulos da prévia | abaixo do piso |
| 11,5 px | 130 | etiquetas de serviço e de status, botões do diário | abaixo do piso |
| 12 px | 506 | rótulos de campo (maiúsculas), detalhes | base de rótulo |
| 12,5 px | 80 | botões de ação rápida | **solto** |
| 13 px | 374 | texto secundário das listas | base secundária |
| 13,5 px | 56 | só na prévia da proposta | **solto** |
| 14 px | 757 | texto de lista, botões pequenos | base |
| 14,5 px | 8 | uma vez, na proposta nova | **solto** |
| 15 px | 214 | chips, títulos de linha | ok |
| 16 px | 737 | campos, botões, texto do manual | base |
| 18 / 19 / 20 / 21 / 22 px | 68 / 28 / 12 / 17 / 54 | título da barra / título de seção / calendário / título de janela / manual | **cinco degraus para a mesma função** (subtítulo) |
| 24 / 26 px | 6 / 6 | prévia da proposta | soltos |
| 28 px | 66 | título da tela e números dos cartões | ok |
| 32 / 44 px | 2 / 6 | login, valor na prévia | ok (pontuais) |

**Tamanhos na área do tutor** — 13 em uso, bem mais enxuto: 12 · 12,5 · 13 · 14 · 15 · 16 · **17 (base)** · 20 · 22 · 24 · 32 · 36 · 42 px. Piso real de 12,5 px (rótulos da barra de abas).

### 2.2 Cores

**Variáveis declaradas**

| Papel | Painel (`gerador.css:10-13`, `app.css:235-237`) | Área do tutor (`portal.css:4`) | Igual? |
|---|---|---|---|
| Texto principal | `--char` / `--ink` `#30251F` | `--c-carvao` `#30251F` | sim, **nomes diferentes** |
| Texto secundário | `--muted` `#7D7068` | `--c-cinza` `#7D7068` | sim, nomes diferentes |
| Marca | `--terra` `#C7694A` | `--c-terra` `#C7694A` | sim |
| Marca escura | `--terra2` `#B05A3D`, `--terra-d` `#9E4E33` | `--c-terra-e` `#A9553A` | **não: três tons para a mesma função** |
| Marca clara | `--terra-t` `#F5E3DA` | `--c-terra-c` `#F4E0D6` | **quase** (diferença invisível, dois valores) |
| Fundo da página | `--page` `#F6EEE5` | `--c-creme` `#F9F3EC` | não |
| Cartão | `--card` `#FDF9F4` | `--c-papel` `#FFFCF8` | não |
| Sálvia | `--sage` `#8A9B7F` | `--c-salvia` `#8A9B7F` | sim |
| Sálvia clara | `--sage2` `#E4E9DF`, `--sage-t` `#E6EBE1` | `--c-salvia-c` `#E4E9DE` | **três valores quase iguais** |
| Sálvia escura | `--sage-d` `#4E6045` | `--c-salvia-e` `#5F6F55` | não |
| Linha | `--line` `#E7DACB` | (usa `#EFE4D7`, `#F1E7DB`) | não |

**Em uso de fato**

| Tipo | Painel | Área do tutor |
|---|---|---|
| Cores de texto | 14 (3 dominam: `#30251F` 1.637 · `#7D7068` 817 · `#5A3B2A` 456) | 7 |
| Fundos | 17 | 10 |
| Bordas | 16 tons (dominante `#E7DACB`, 498; outros 10 tons bege entre `#DCC9B6` e `#EFE4D7`) | 5 |
| Cores distintas escritas à mão no CSS | `app.css` **66** · `gerador.css` 21 | `portal.css` 16 |

Fora do padrão [Objetivo]: 66 cores soltas em `app.css` contra 161 usos de variável; 11 beges de borda que o olho não distingue; `#4C443E`, `#6B5A4E`, `#9A3F2A`, `#A4402A` como variações avulsas de marrom e vermelho.

**Significado das cores** (coerente, vale manter): terracota = ação principal e "precisa de você" · sálvia = confirmado/feito · carvão = selecionado e WhatsApp · vermelho-tijolo `#9A3F2A` = excluir. Um desvio: cartão "AGUARDANDO RESPOSTA" e "COBRAR AGORA" usam fundo terracota claro (atenção), mas "VENCIDO" no Financeiro, que é mais grave, fica neutro.

### 2.3 Espaçamentos, raios e sombras

| Item | Em uso | Padrão de fato | Fora do padrão |
|---|---|---|---|
| Espaços entre itens (painel) | 15 valores | **4 · 8 · 12** (+ 2, 6, 10) | 5 px (200 usos), 11, 17, 18, 22 px |
| Espaços (área do tutor) | 8 valores | 2 · 6 · 10 · 14 | escala própria, diferente do painel |
| Raios (painel) | 10 valores | **999 px** (botões/chips) · **12 px** (campos) · **14–16 px** (cartões) | 6, 9, 10, 18, 20, 22 px |
| Raios (área do tutor) | 7 valores | 999 · 18 · 22 · 26 px | mais arredondada que o painel |
| Sombras (painel) | 9 | quase sem sombra; contorno interno de 1 px | 3 sombras "de verdade" diferentes para o que flutua (botão flutuante, janela, prévia) |

### 2.4 Botões e componentes

**Painel** — 9 famílias de botão

| Variante | Aparência | Altura medida | Uso | Observação |
|---|---|---|---|---|
| `btn primary` | terracota, branco, 16 px/700 | 39 · 45 · 47 · 49 · 50 px | ação principal | **5 alturas** conforme o lugar |
| `btn primary fab` | idem, com sombra | 46 px | "+ Nova proposta", "+ Novo pet" | cobre conteúdo |
| `btn soft` | areia `#ECE1D4`, marrom | 39 · 41 · 45 · 49 px | ação secundária | 4 alturas |
| `btn small` (soft/primary) | 14 px no celular, 13 px no PC | 42 px (cel) · **28 px (PC)** | filtros, "Recebi", "Enviar" do topo | no PC fica pequeno |
| `btn wa` | carvão | 39 · 45 px | WhatsApp | ok |
| `btn danger` | contorno tijolo | 41 · 47 px | excluir, sair | ok |
| `btn mini` | branco com borda, 12 px | **30 px (cel) · 25 px (PC)** | "Trocar foto", "Enquadrar" | alvo pequeno |
| `qa-b` | contorno, 12,5 px | **30 px** | "Aceitou", "Recusou", "Cobrar", "Adiar" | **a ação mais usada do painel é o menor botão** |
| `chip` | pílula branca / carvão quando ligada | 42 px (cel) · 35 px (PC) | escolhas e filtros | ok |
| Links de texto minúsculos | sublinhado, 13–14 px, sem área de toque | 18–33 px | "trocar", "desfazer", "desvincular", "editar ›", "remover" | parecem texto, não ação |

**Área do tutor** — 3 famílias (`pt-btn` 54 px, `pt-btn-2` 44 px, `pt-link-a` 38 px). Simples e coerente. A barra de abas tem 57 px de altura.

**Campos:** um padrão só nos dois lugares — 46 px de altura, 16 px, raio 12 px, borda `#E7DACB`, fundo branco. Único desvio: seletor de nível em Configurações (36 px, raio 10 px).

**Ícones:** um traço só (1,6 px) em quase tudo; 1,5 px em 25 ícones e 1,8 px em 20 (prévia da proposta). Tamanhos: 15, 16, 17, 18 px para o mesmo papel de "ícone dentro de botão" — poderiam ser um só.

**Estados**

| Estado | Painel | Área do tutor |
|---|---|---|
| Foco no teclado | sem regra própria: botões ficam com o contorno padrão do navegador; campos trocam a borda e ganham um halo de 15% de opacidade (fraco) | regra única: contorno terracota de 3 px (`portal.css:11`) |
| Passar o mouse | só 4 regras em `app.css`; a maioria dos botões não reage | não se aplica (celular) |
| Desabilitado | existe (2 regras) | existe |
| Carregando | esqueleto no painel inicial; nas outras telas, texto | texto |
| Vazio | 28 mensagens, quase todas com tom bom | presentes |
| Erro | avisos temporários ("Não consegui…") | idem |
| Movimento reduzido | **não tratado** | tratado |

### 2.5 Glossário em uso

| Conceito | Nomes encontrados | Onde |
|---|---|---|
| Documento de preço | **proposta** (137 trechos no painel) · **orçamento** (14 no painel, 11 na área do tutor) | "Histórico de orçamentos" e "ORÇAMENTOS" na tela do tutor; "Orçamentos enviados…" em Cobrar; "Data em que o orçamento foi criado" no filtro |
| Pessoa que contrata | **tutor** (170) · **cliente** (35) | passo "1 Cliente" com campo "NOME DO TUTOR"; filtro "Por cliente"; "Cliente aceitou"; "Cliente ativo" na ficha do **pet** |
| Tela de ajustes | **Configurações** (celular, título) · **Ajustes** (menu do computador) | `app.js:19`, `app.js:37`, `app.js:57` |
| Manual | **Como usar** (celular, título) · **Ajuda** (menu do computador) | `app.js:20`, `app.js:37` |
| Remédio | **Remédios** (rótulo) · **medicação** (15 trechos, interno e em avisos) | ficha do pet |
| Aceite | "Aceitou" · "Cliente aceitou" · "Aceitou a opção 1" · status "Aceita" · no tutor "Confirmar" | listas, menu da proposta, área do tutor |
| Data de criação | "feita em" · "Emitida em" · "Feita em" | tela do tutor × prévia da proposta × filtro |
| Papel de acesso | "NÍVEL" · "Administrador/Gestora/Assistente" | Configurações (coerente; só registrar) |
| Pet no local | "hospedado" · "hóspedes" · "Com a Lari agora" | Hoje, Agenda, Pets |
| Salvar com sucesso | "Salvo" · "Salvo ✓" · "Atualizado" · "Atualizado ✓" · "Pronto" · "Pet salvo" · "Foto salva" · "Foto salva!" | avisos |

---

## 3. Avaliação por tela

Notas de 1 a 5. Achados que se repetem em várias telas estão na seção 4 e não são repetidos aqui.

### 3.1 Entrar (login) — clareza 3 · consistência 4 · visual 4

| O quê | Onde | Por quê | Sugestão | Etiqueta |
|---|---|---|---|---|
| "Primeiro acesso" é um link pequeno que **usa os campos de cima** sem avisar | abaixo do botão | Quem nunca entrou toca no link com os campos vazios e só então descobre a regra | Atual: `Primeiro acesso` → Sugerido: `É meu primeiro acesso: criar senha` + frase fixa: `Primeira vez? Digite seu e-mail, invente uma senha e toque aqui.` | Objetivo |
| Mínimo de senha diverge: a tela fala em 6, a troca obrigatória exige 8 | `app.js:114`, `146` (6) × `app.js:170-176`, `config.js:88-92` (8) × `config.js:111` (6) | Senha de 6 é aceita num lugar e recusada em outro | Usar 8 em todos. Atual: `(mínimo 6 caracteres)` → Sugerido: `(pelo menos 8 caracteres)` | Objetivo |
| Tela não diz o que é | topo | Só logo + campos; para a Larissa basta, para um assistente novo falta contexto | Linha sob a logo: `Painel da Pet Lar` | Opinião |

### 3.2 Hoje — clareza 4 · consistência 4 · visual 5

| O quê | Onde | Por quê | Sugestão | Etiqueta |
|---|---|---|---|---|
| Plural com "(s)" | cartão "Serviços hoje" (`hoje.js:40`) | Soa a formulário, destoa do tom | Atual: `1 hospedado(s)` → Sugerido: `1 hospedado` / `2 hospedados` | Objetivo |
| "2 informações faltando (WhatsApp, fotos, raças, datas)" | cartão "Completar cadastros" | Lista quatro tipos mesmo quando faltam dois | Sugerido: listar só o que falta: `Faltam 2: WhatsApp de 1 tutor e foto de 1 pet` | Opinião |
| Botão flutuante cobre o cartão do serviço do dia | `folha-1` (Zully) | Esconde "Diário de hoje", a ação mais usada da tela | Ver T-06 | Objetivo |
| Saudação sem nome | "Boa tarde!" | O painel sabe quem entrou; a área do tutor já cumprimenta pelo nome | Sugerido: `Boa tarde, Lari!` | Opinião |

### 3.3 Propostas — clareza 4 · consistência 3 · visual 4

| O quê | Onde | Por quê | Sugestão | Etiqueta |
|---|---|---|---|---|
| Linha de resumo densa | sob os chips | Quatro números numa frase de 13 px cinza (contraste 4,16:1) | Atual: `Enviadas aguardando: 3 · Aceitas: 2 · Recusadas: 1 · Taxa de aceite: 67%` → Sugerido: colocar a contagem dentro dos chips (`Enviadas 3`, `Aceitas 2`) e deixar só `2 de cada 3 propostas são aceitas` | Opinião |
| Filtro "Por cliente" | chips | No resto da tela a pessoa é "tutor" (a busca diz "Buscar por tutor ou número") | Atual: `Por cliente` → Sugerido: `Por tutor` | Objetivo |
| No rascunho, "Enviar", "Aceitou" e "Recusou" lado a lado | cartão PL-2026-005 | Rascunho ainda não foi enviado: aceitar/recusar não faz sentido nesse estado | Mostrar só `Terminar e enviar` | Objetivo |
| Busca sem rótulo para leitor de tela | campo de busca | só tem texto de exemplo | `aria-label="Buscar proposta"` | Objetivo |

### 3.4 Cobrar resposta — clareza 4 · consistência 3 · visual 4

| O quê | Onde | Por quê | Sugestão | Etiqueta |
|---|---|---|---|---|
| "Cobrar" tem dois sentidos no produto | menu "Cobrar", botão "Cobrar (2ª)" × Financeiro "cobrar no WhatsApp" | Aqui é cobrar **resposta**; no Financeiro é cobrar **pagamento** | Menu: `Cobrar` → `Respostas`; botão: `Cobrar (2ª)` → `Lembrar (2ª vez)`; no Financeiro manter "cobrar" | Opinião |
| Texto de abertura mistura "orçamentos" e primeira pessoa longa | parágrafo sob o título | Único lugar do painel que chama de orçamento | Atual: `Orçamentos enviados que ainda não tiveram resposta. Toque em Cobrar para abrir o WhatsApp com a mensagem pronta. A cobrança fica registrada e eu lembro de novo depois.` → Sugerido: `Propostas enviadas e ainda sem resposta. Toque em Lembrar: o WhatsApp abre com a mensagem pronta e eu aviso quando for hora de lembrar de novo.` | Objetivo (termo) |
| "SEM RESPOSTA HÁ 15+ DIAS" × "Sem resposta há mais de 15 dias" | cartão × título da seção | Duas grafias na mesma tela | Usar `mais de 15 dias` nos dois | Objetivo |
| "Adiar" cai sozinho na linha de baixo | ações do cartão, 390 px | Parece sobra | Grade 2×2 ou ícone sem texto para "Adiar" | Objetivo |

### 3.5 Proposta (editor e prévia) — clareza 3 · consistência 3 · visual 4

| O quê | Onde | Por quê | Sugestão | Etiqueta |
|---|---|---|---|---|
| Três "Enviar" | topo, barra fixa, passo 5 (`folha-2`) | Não fica claro qual vale; em proposta **aceita** o botão continua lá | Um só, na barra fixa. Rascunho: `Enviar para o tutor` · Enviada: `Reenviar` · Aceita: `Mandar de novo o PDF` | Objetivo |
| Passo 1 chama "Cliente", campos chamam "Tutor" | "1 Cliente" → "NOME DO TUTOR" | Dois nomes em 40 px de tela | Atual: `Cliente` / `Cliente cadastrado` → Sugerido: `Tutor` / `Tutor já cadastrado` | Objetivo |
| Rótulo "VALE POR (DIAS)" | passo 1 | Abreviado demais | Sugerido: `Proposta vale por quantos dias?` | Opinião |
| Avisos explicativos longos no passo 4 | "Deixe vazio para usar a conta da tabela. Use quando fechar um valor diferente com o cliente. Conta da tabela: —" | Três frases em 12 px sob um campo | Sugerido: `Só preencha se combinou um valor diferente. Pela tabela: —` | Opinião |
| Prévia usa tamanhos e traços próprios | 10, 11, 13,5, 24, 26, 44 px; ícones 1,8 px | É documento, pode ter escala própria, mas 10 px some no celular do tutor | Piso de 11,5 px na prévia | Objetivo (tamanho) |
| Estado "Salvo ✓" discreto | canto do topo, 13 px cinza | É a principal garantia para quem tem medo de perder o que digitou | Manter, mas com ícone verde-sálvia e texto `Salvo às 16:02` | Opinião |

### 3.6 Pets e ficha do pet — clareza 4 · consistência 4 · visual 4

| O quê | Onde | Por quê | Sugestão | Etiqueta |
|---|---|---|---|---|
| Seletores de aniversário cortados | ficha, 390 px (`folha-2`: "Di", "Não sei o") | Texto ilegível | Rótulos curtos: `Dia` · `Mês` · `Ano` (opção vazia: `Não sei`) | Objetivo |
| "Cliente ativo" na ficha do pet | caixa de marcar | Quem é ativo é o pet | Atual: `Cliente ativo` → Sugerido: `Pet ativo (aparece nas listas)` | Objetivo |
| "Pode ser reativo / agressivo" × "…(combinar antes do banho)" | ficha × proposta | Mesmo campo, dois textos | Um só: `Pode reagir com estranhos ou outros pets` | Objetivo |
| Links minúsculos "trocar", "trocar tutor", "abrir" | foto, bloco Tutor, diário | Minúsculas e sem cara de botão; alvo de 18 px | `Trocar foto` já existe ao lado; tirar o "trocar" da foto. `Trocar tutor`, `Abrir` como botão pequeno | Objetivo |

### 3.7 Tutores e ficha do tutor — clareza 4 · consistência 3 · visual 4

| O quê | Onde | Por quê | Sugestão | Etiqueta |
|---|---|---|---|---|
| "ORÇAMENTOS", "Histórico de orçamentos", "Nenhum orçamento ainda." | cartões e seção | Painel chama de proposta | `PROPOSTAS` · `Histórico de propostas` · `Nenhuma proposta ainda.` | Objetivo |
| "JÁ CONTRATOU R$ 500" | cartão | Verbo + valor lê estranho | Sugerido: `TOTAL CONTRATADO` | Opinião |
| "100% aceitos" com 2 orçamentos e 1 aceito | cartão ORÇAMENTOS | Com 1 rascunho + 1 aceita, 100% está certo na conta, mas confunde ao lado de "2" | Mostrar `1 de 1 enviada foi aceita` | Opinião |
| Descrição da área do tutor é uma frase de 30 palavras | bloco "Área do tutor" | Difícil de bater o olho | Sugerido: `Um link só da Sabrina, sem senha. Por ele, ela vê o diário, confirma orçamentos, paga o sinal e completa a ficha dos pets.` | Opinião |

### 3.8 Agenda — clareza 4 · consistência 4 · visual 4

| O quê | Onde | Por quê | Sugestão | Etiqueta |
|---|---|---|---|---|
| Texto de 10–11 px no calendário, cinza 4,16:1 | dias da semana, nomes nos dias | Menor texto do sistema, na tela mais consultada na rua | Dias da semana em 12 px carvão; no celular trocar nomes por bolinhas coloridas + lista do dia embaixo (já existe) | Objetivo |
| Legenda técnica | "Fundo terracota = mais hóspedes que a capacidade (3)" | "Terracota" é nome de cor de designer | Sugerido: `Dia em destaque = mais de 3 hóspedes (acima do seu limite)` | Opinião |
| Data em minúscula | "sexta-feira, 13 de novembro" | Área do tutor escreve "Sexta-feira, 13 de novembro" | Maiúscula inicial nos dois | Objetivo |

### 3.9 Financeiro — clareza 4 · consistência 4 · visual 4

| O quê | Onde | Por quê | Sugestão | Etiqueta |
|---|---|---|---|---|
| "2 parcela(s)", "2 pagamento(s)", "2 serviço(s) · ticket R$ 483" | cartões (`financeiro.js:37-40`) | "(s)" e "ticket" (jargão) | `2 parcelas` · `2 pagamentos` · `2 serviços · média de R$ 483` | Objetivo |
| "Recebi" × aviso "Recebido" × "desfazer" | botão, aviso, link | Par de ações com pesos visuais opostos: botão grande × link minúsculo | Botão `Recebi` → aviso `Pagamento registrado · Desfazer` (desfazer dentro do aviso) | Opinião |
| "VENCIDO R$ 0 · cobrar no WhatsApp" | cartão | Com zero vencido, a instrução sobra | Quando zero: `Nada vencido` | Objetivo |

### 3.10 Diário do serviço — clareza 5 · consistência 4 · visual 4

| O quê | Onde | Por quê | Sugestão | Etiqueta |
|---|---|---|---|---|
| Botões de registro com texto de 11,5 px | grade "Comeu / Bebeu água…" | Tela usada com uma mão e o pet na outra | 13 px e ícone 24 px (o botão já tem 79–92 px de altura) | Objetivo |
| "Registrar para:" em 11 px | acima dos chips de pet | Decide em qual pet o registro cai; merece destaque | 14 px, carvão | Opinião |
| "Fotos no WhatsApp" entre botões de registro | grade | Não é registro, é um atalho de outro tipo | Separar visualmente (contorno) ou mover para junto de "Mandar resumo do dia" | Opinião |

### 3.11 Configurações — clareza 4 · consistência 3 · visual 3

| O quê | Onde | Por quê | Sugestão | Etiqueta |
|---|---|---|---|---|
| Ações de acesso como três links minúsculos | "link de senha · senha provisória · remover" | Ações sérias (remover acesso) com aparência de rodapé e alvo de 18 px | Botões pequenos: `Mandar link de senha` · `Criar senha provisória` · `Remover acesso` (este em tijolo) | Objetivo |
| Rótulos longos em maiúsculas | "LEMBRAR PROPOSTA SEM RESPOSTA APÓS (DIAS)", "CONSIDERAR “SEM RESPOSTA” DEPOIS DE (DIAS)" | Maiúsculas em frase longa são difíceis de ler | Minúsculas em rótulo com mais de 3 palavras: `Lembrar de cobrar depois de quantos dias?` · `Dar como sem resposta depois de quantos dias?` | Objetivo (legibilidade) / Opinião (texto) |
| "Dados no Supabase (São Paulo)…" | Sobre | Jargão técnico para a Larissa | `Seus dados ficam guardados em servidor no Brasil.` | Opinião |
| "Fotos e vídeos guardados" aparece com o recurso pausado | bloco | Mostra "0 vídeos" de um recurso que não está em uso | Esconder enquanto a mídia no painel estiver pausada | Objetivo |

### 3.12 Janelas (Mais, Filtros, Enviar, Adiar, Resumo) — clareza 4 · consistência 4 · visual 4

| O quê | Onde | Por quê | Sugestão | Etiqueta |
|---|---|---|---|---|
| Cada janela fecha com um nome | "Fechar" (menu da proposta, enviar, resumo) × "Cancelar" (filtros, adiar) | Mesmo gesto, dois nomes | `Cancelar` quando há algo a aplicar; `Fechar` quando é só leitura — já é quase isso; alinhar o menu da proposta | Objetivo |
| Menu da proposta: "Cliente aceitou / Cliente recusou" × lista: "Aceitou / Recusou" | menu ••• × ações rápidas | Mesma ação | `Tutor aceitou` · `Tutor recusou` nos dois (na lista pode ficar `Aceitou`) | Objetivo |
| "Abrir conversa com a mensagem" | janela Enviar | Não diz onde | `Abrir o WhatsApp com a mensagem` | Objetivo |
| "Compartilhar imagem (card)" | janela Enviar | "card" é jargão | `Compartilhar como imagem` | Objetivo |

### 3.13 Área do tutor — clareza 5 · consistência 4 · visual 5

A melhor parte do produto: uma ideia por tela, texto de 17 px, cumprimento pelo nome, "Nada é obrigatório".

| O quê | Onde | Por quê | Sugestão | Etiqueta |
|---|---|---|---|---|
| Dica cita botão que não existe | Mais → Seus dados (`portal.js:310`) | Botão é "Contar" | Atual: `Toque em Preencher` → Sugerido: `Toque em Contar` | Objetivo |
| "Contar" como verbo para e-mail e bairro | Seus dados | "Contar o e-mail" soa estranho; funciona bem só na ficha do pet | Em Seus dados: `Preencher` / `Mudar`. Na ficha do pet manter `Contar` | Opinião |
| "Confirmado! A Lari já foi avisada." | aviso depois de aceitar (`portal.js:366`) | Não achei no código nenhum envio de aviso para a Larissa; a proposta só muda de status | Atual → Sugerido: `Confirmado! A Lari vai ver na agenda dela.` (ou criar o aviso de verdade) | Objetivo (promessa sem lastro; **provável**, não vi notificação no código) |
| Registro do diário sem espaço entre ação e nome | aba Diário: "ComeuBento" no texto lido por leitor de tela | Visualmente há espaço; no texto corrido, não | Incluir espaço/vírgula real: `Comeu · Bento` | Objetivo |
| "Deixar na tela do celular" | Mais | Bom texto; só falta dizer que abre instruções | `Deixar na tela do celular · ver como` | Opinião |
| Hora em verde-sálvia sobre sálvia clara: 4,37:1 | Início, "O dia do Bento" (13 px) | Reprova AA por pouco | Usar `--c-carvao` na hora | Objetivo |
| Texto de apoio cinza sobre creme: 4,34:1 | "2 fotos e 1 vídeo…", "Este link é só seu…" | Reprova AA por pouco | Cinza `#6B5F57` (já existe no código) | Objetivo |

---

## 4. Inconsistências transversais

| ID | O quê | Evidência | Etiqueta |
|---|---|---|---|
| T-01 | **Terracota como texto e como fundo de botão reprova contraste** | branco/`#C7694A` 3,79:1 · `#C7694A`/`#FDF9F4` 3,61:1 · `#C7694A`/`#F5E3DA` 3,04:1 — ~190 ocorrências | Objetivo |
| T-02 | **Cinza de apoio no limite** | `#7D7068` dá 4,48 sobre `#FBF7F1`, 4,34 sobre `#F9F3EC`, 4,16 sobre `#F6EEE5`, 3,85 sobre `#F5E3DA` — ~150 ocorrências | Objetivo |
| T-03 | **Texto abaixo de 12 px** | ~390 trechos entre 10 e 11,5 px no painel | Objetivo |
| T-04 | **Dois nomes para a mesma coisa** | glossário 2.5: proposta/orçamento, cliente/tutor, Configurações/Ajustes, Como usar/Ajuda, feita/emitida | Objetivo |
| T-05 | **Pesos de fonte que não existem** | Lato 500/600/800 e Playfair 400/500 pedidos em 267 trechos; arquivos só têm 400/700/900 e 600/700/800 | Objetivo |
| T-06 | **Botão flutuante cobre conteúdo** | "+ Nova proposta" sobre "Recusou" (PC) e sobre o cartão do dia / "Adiar" (celular) | Objetivo |
| T-07 | **Título repetido no celular** | barra do topo "Propostas" + título grande "Propostas" logo abaixo, em todas as telas de lista (`folha-1`) | Objetivo |
| T-08 | **Rótulos de campo todos em maiúsculas** | 200 rótulos 12 px/700 maiúsculos; funciona em "NOME", atrapalha em frases | Opinião |
| T-09 | **Ações em link minúsculo sem área de toque** | "trocar", "desfazer", "desvincular", "editar ›", "remover", "abrir", "link de senha" (18–33 px) | Objetivo |
| T-10 | **Alturas de botão variam sem regra** | principal: 39/45/47/49/50 px; pequeno: 42 px no celular e 28 px no PC | Objetivo |
| T-11 | **Plural com "(s)"** | 12 pontos no código (`hoje.js:40`, `financeiro.js:37-40`, `config.js:131-132`, `proposta.js:182-183`, `app.js:155`, `190`) | Objetivo |
| T-12 | **Avisos de sucesso sem padrão** | "Salvo", "Atualizado", "Atualizado ✓", "Pronto", "Foto salva", "Foto salva!", "Desfeito", "Apagado" | Objetivo |
| T-13 | **Erro mostra mensagem técnica** | "Não consegui salvar: " + texto do servidor (em inglês) em 8 pontos | Objetivo |
| T-14 | **Foco de teclado sem padrão no painel** | área do tutor tem regra única; painel depende do navegador | Objetivo |
| T-15 | **Dois conjuntos de variáveis de cor** | `--terra` × `--c-terra`, `--char` × `--c-carvao`…; fundos e cartões com valores diferentes | Objetivo |
| T-16 | **Raio dos cartões varia** | 12, 14, 16, 18, 22 px para cartão | Objetivo |
| T-17 | **Quem fala?** | Quase sempre o sistema em 1ª pessoa ("Não consegui", "eu lembro"); às vezes 3ª pessoa ("Com a Lari agora") e "Obrigada!" no feminino na área do tutor | Opinião — funciona se virar regra (ver 6.5) |

---

## 5. Backlog priorizado

Ordenado por impacto ÷ esforço. Esforço: **P** até ~1 h · **M** meio dia · **G** mais de um dia.

| ID | Item | Onde | Por quê | Tipo | Etiqueta | Impacto | Esforço | Prior. |
|---|---|---|---|---|---|---|---|---|
| F-01 | Botão principal e texto de destaque em `#A9553A` | variáveis de cor | T-01: contraste reprovado no elemento mais importante | Acessibilidade | Objetivo | 5 | P | P0 |
| F-02 | Corrigir "Toque em Preencher" | `portal.js:310` | dica aponta botão inexistente | Texto | Objetivo | 3 | P | P0 |
| F-03 | Glossário: proposta / orçamento / tutor; mesmos nomes de menu no celular e no PC | `app.js:37`, `tutor.js`, `cobrar.js`, `filtros.js`, `proposta.js` | T-04 | Consistência | Objetivo | 4 | P | P0 |
| F-04 | Tirar "(s)" dos plurais | 12 pontos (T-11) | tom e correção | Texto | Objetivo | 3 | P | P0 |
| F-05 | Mínimo de senha igual em todos os lugares (8) | `app.js:114`, `146`, `config.js:42`, `111` | regra contraditória | Consistência | Objetivo | 3 | P | P0 |
| F-06 | Piso de 12 px e rótulos dos cartões em marrom | `app.css` (rótulos, etiquetas, agenda) | T-03 | Acessibilidade | Objetivo | 4 | P | P0 |
| F-07 | Cinza de apoio mais escuro (`#6B5F57`) | `--muted`, `--c-cinza` | T-02 | Acessibilidade | Objetivo | 3 | P | P1 |
| F-08 | Rascunho sem "Aceitou/Recusou"; só "Terminar e enviar" | `propostas.js`, `acoes.js` | ação sem sentido no estado | Texto | Objetivo | 3 | P | P1 |
| F-09 | Padrão de avisos (sucesso e erro) e erro sem texto técnico | `ui.js` + chamadas de aviso | T-12, T-13 | Texto | Objetivo | 3 | P | P1 |
| F-10 | Pesos de fonte: usar só 400/700/900 (Lato) e 700 (Playfair) | os três CSS | T-05 | Consistência | Objetivo | 2 | P | P1 |
| F-11 | Seletores de aniversário com rótulos curtos | `pet.js`, `ui.js` | texto cortado | Visual | Objetivo | 2 | P | P1 |
| F-12 | Rótulos acessíveis nas buscas; "Comeu · Bento" com separador real | `propostas.js`, `tutores.js`, `portal.js` | leitor de tela | Acessibilidade | Objetivo | 2 | P | P1 |
| F-13 | Textos reescritos da seção 3 (login, cobrar, financeiro, janelas, configurações) | vários | clareza | Texto | misto | 3 | P | P1 |
| F-14 | Um único "Enviar" por estado da proposta | `proposta.js` | principal dúvida de uso | Texto | Objetivo | 5 | M | P1 |
| F-15 | Ações rápidas com 40–44 px, em grade 2×2 no celular | `app.css` (`.qa-b`) | ação mais usada é o menor botão | Visual | Objetivo | 4 | M | P1 |
| F-16 | Botão flutuante sem cobrir conteúdo (espaço no fim da lista; no PC, botão fixo no topo) | `app.css` (`.fab`) | T-06 | Visual | Objetivo | 3 | P | P1 |
| F-17 | Links minúsculos viram botões pequenos com área de toque | pet, tutor, financeiro, config | T-09 | Acessibilidade | Objetivo | 3 | M | P1 |
| F-18 | Foco de teclado único (contorno 3 px) no painel | `app.css` | T-14 | Acessibilidade | Objetivo | 2 | P | P1 |
| F-19 | Tirar o título repetido no celular (barra do topo só com a logo, ou sem o título grande) | `app.js`, `app.css` | T-07 | Visual | Objetivo | 2 | P | P2 |
| F-20 | Rótulos longos em minúsculas | `gerador.css` (rótulo) + textos | T-08 | Visual | Opinião | 2 | P | P2 |
| F-21 | "A Lari já foi avisada": mudar o texto ou criar o aviso | `portal.js:366` | promessa sem lastro | Texto | Objetivo | 3 | P (texto) / G (aviso) | P1 |
| F-22 | Escala tipográfica de 8 degraus (seção 6.1) | os três CSS | 22 tamanhos | Consistência | Objetivo | 3 | M | P2 |
| F-23 | Alturas de botão: 3 tamanhos (seção 6.4) | `app.css`, `gerador.css` | T-10 | Consistência | Objetivo | 2 | M | P2 |
| F-24 | Um arquivo de variáveis para painel e área do tutor | novo `tokens.css` | T-15, 66 cores soltas | Consistência | Objetivo | 3 | G | P2 |
| F-25 | Raios: 12 px (campo) · 16 px (cartão) · 999 px (botão) | os três CSS | T-16 | Consistência | Objetivo | 1 | M | P2 |
| F-26 | Respeitar "movimento reduzido" no painel | `app.css` | já existe na área do tutor | Acessibilidade | Objetivo | 1 | P | P2 |

---

## 6. Guia de padrão proposto

Tudo abaixo parte do que já existe e funciona; onde há dois valores, escolhi o mais usado ou o que passa em contraste.

### 6.1 Escala tipográfica

| Nome | Tamanho / peso | Família | Uso |
|---|---|---|---|
| Título de tela | 28 px / 700 | Playfair | um por tela |
| Título de seção | 20 px / 700 | Playfair | seções, janelas, mês do calendário (substitui 18–22) |
| Número de destaque | 28 px / 700 | Playfair | cartões de número |
| Texto de linha | 16 px / 700 | Lato | nome do tutor/pet nas listas, botões |
| Texto base | 16 px / 400 | Lato | campos, parágrafos (17 px na área do tutor) |
| Texto secundário | 14 px / 400 | Lato | segunda linha das listas, ajuda de campo |
| Rótulo | 12 px / 700 | Lato | rótulo de campo, etiquetas, legendas |
| **Piso** | 12 px | — | nada abaixo disso (prévia do PDF: 11,5 px) |

Pesos permitidos: Lato 400, 700, 900 · Playfair 700. Sem meios-pixels.

### 6.2 Paleta e uso

| Nome | Valor | Uso | Não usar para |
|---|---|---|---|
| Carvão | `#30251F` | texto principal; chip ligado; botão do WhatsApp | — |
| Marrom | `#5A3B2A` | texto de botão secundário; rótulos de cartão | — |
| Cinza quente | `#6B5F57` (hoje `#7D7068`) | texto de apoio | texto abaixo de 14 px sobre fundo colorido |
| Terracota forte | `#A9553A` | **fundo do botão principal**, links, texto de destaque | — |
| Terracota | `#C7694A` | ícones, bordas de destaque, barras, bolinha de contagem com número ≥ 12 px em negrito | texto pequeno; fundo de botão com texto branco |
| Terracota claro | `#F5E3DA` | fundo de "precisa de você" (aguardando, cobrar, vencido) | — |
| Sálvia escura | `#4E6045` | texto de confirmado/feito | — |
| Sálvia clara | `#E6EBE1` | fundo de confirmado/feito | — |
| Tijolo | `#9A3F2A` | excluir, remover, sair | qualquer outra coisa |
| Página / Cartão / Areia | `#F6EEE5` / `#FDF9F4` / `#ECE1D4` | fundo / cartões / botão secundário | — |
| Linha | `#E7DACB` | toda borda de 1 px | (aposenta os outros 10 beges) |

### 6.3 Espaçamentos e raios

- Espaços: **4 · 8 · 12 · 16 · 24 px**. (5, 6, 10, 11, 14, 17, 18, 22 saem.)
- Raios: **12 px** campos · **16 px** cartões e janelas · **999 px** botões, chips e etiquetas. A área do tutor pode manter cartões em 22–26 px como traço próprio.
- Sombra: só no que flutua (botão flutuante, janela), uma única: `0 6px 16px rgba(48,37,31,.18)`.

### 6.4 Componentes

| Componente | Regra |
|---|---|
| Botão principal | terracota forte, branco, 16 px/700, **48 px** de altura; **um por tela** |
| Botão secundário | areia, marrom, 48 px |
| Botão pequeno | 14 px/700, **40 px** de altura (celular e PC) — ações rápidas, filtros, "Recebi" |
| Botão de perigo | contorno tijolo; sempre pede confirmação |
| Chip | 40 px; ligado = carvão |
| Link de texto | só para navegar ("Ver todas", "‹ Propostas"); **ação nunca é link minúsculo** |
| Campo | 46 px, 16 px, raio 12, borda Linha; rótulo acima; exemplo com "Ex.:" |
| Rótulo de campo | maiúsculas só até 3 palavras; pergunta ou frase vai em minúsculas 14 px |
| Ícone | traço 1,6 px; 18 px dentro de botão, 24 px na barra de navegação |
| Foco | contorno terracota 3 px com 2 px de folga, em tudo |

### 6.5 Tom de voz

| Princípio | Assim sim | Assim não |
|---|---|---|
| **O painel fala em primeira pessoa, como um ajudante** | `Não consegui salvar. Confira a internet e tente de novo.` | `Erro ao salvar: Failed to fetch` |
| **Diz o que vai acontecer ao tocar** | `Abrir o WhatsApp com a mensagem` | `Abrir conversa` |
| **Conta como gente, não como formulário** | `2 parcelas` · `1 hospedado` | `2 parcela(s)` · `1 hospedado(s)` |
| **Sem palavra de bastidor** | `média de R$ 483` · `como imagem` | `ticket` · `card` · `Supabase` · `status` |
| **Com o tutor, a Lari é a pessoa; o sistema some** | `Conte para a Lari o que souber. Nada é obrigatório.` | `Preencha os campos pendentes do cadastro` |

Maiúsculas: só a primeira letra em títulos, botões e avisos ("Nova proposta", não "Nova Proposta"). Ponto final em frases completas; sem ponto em rótulos e botões. Exclamação só em comemoração ("Proposta aceita!").

### 6.6 Glossário oficial

| Use | Não use | Observação |
|---|---|---|
| **proposta** (painel) | orçamento | é o nome do documento, tem número PL- |
| **orçamento** (área do tutor) | proposta | palavra que o tutor usa; só lá |
| **tutor** | cliente | em todo lugar; "cliente" sai |
| **pet** | animal, bichinho | |
| **serviço** | atendimento, cuidado (painel) | na área do tutor "cuidados" pode ficar |
| **hospedado / hóspede** | interno | |
| **remédios** | medicação, medicamento | |
| **Configurações** · **Como usar** | Ajustes · Ajuda | iguais no celular e no PC |
| **Aceitou / Recusou** (botões) · **Aceita / Recusada** (estado) | Cliente aceitou | |
| **Lembrar** (pedir resposta) · **Cobrar** (pedir pagamento) | cobrar para os dois | muda o menu "Cobrar" para "Respostas" |
| **criada em** | feita em, emitida em | |
| **sinal** · **saldo** | entrada, restante | |

### 6.7 Padrão de mensagens

| Tipo | Fórmula | Exemplo |
|---|---|---|
| Sucesso | o que foi feito, no particípio, sem enfeite | `Pet salvo` · `Foto salva` · `Pagamento registrado` |
| Sucesso com desfazer | feito + ação | `Pagamento registrado · Desfazer` |
| Erro | `Não consegui` + o quê. + o que fazer | `Não consegui enviar a foto. Confira a internet e tente de novo.` |
| Validação | o que falta, direto | `Escreva o nome do tutor.` · `A senha precisa de pelo menos 8 caracteres.` |
| Vazio (ainda sem nada) | o que é + como começa | `Nenhuma proposta ainda. Toque em + Nova proposta.` |
| Vazio (filtro) | diz que é o filtro | `Nada encontrado com essa busca ou filtro.` |
| Carregando | esqueleto da tela; texto só se passar de 2 s | `Carregando propostas…` |

---

## 7. Evolução futura

| Ideia | Motivo |
|---|---|
| Página de componentes viva (`/estilo`) com botões, campos, cores e textos-padrão | o guia acima deixa de ser documento e vira referência que se testa |
| Levar para o painel o "jeito" da área do tutor: uma ideia por tela, texto maior, menos rótulos | é a parte mais clara do produto; o painel no celular ganharia fôlego |
| Agenda do celular como lista de dias (calendário só no PC) | o calendário de 7 colunas em 390 px obriga texto de 10 px |
| Proposta em modo "passo a passo" no celular (um passo por tela, barra de progresso) | hoje são cinco blocos numa rolagem longa com barra fixa por cima |
| Estados vazios com ilustração da marca (os mascotes da logo) | reforça identidade nos momentos de menor conteúdo |
| Modo escuro | uso à noite no fim do serviço; hoje não existe |
| Mensagens dos e-mails de acesso no mesmo tom | não estão no código (ficam no painel do fornecedor); provavelmente ainda no texto padrão em inglês |
| Aviso real para a Larissa quando o tutor confirma | transforma a frase "a Lari já foi avisada" em verdade |

---

## 8. Lacunas

| O que ficou sem verificar | Motivo |
|---|---|
| Site no ar com login | não digito senhas; tudo foi medido com banco simulado, que usa o mesmo código e CSS |
| Estado "passar o mouse" e animações | medição feita em estado de repouso; só contei as regras no CSS |
| Estados de erro reais (rede caindo no meio de um envio) e carregamento lento, tela a tela | conferidos pelo texto no código, não reproduzidos um a um |
| iPhone real (Safari): fontes, seletores nativos, formato da data (apareceu mm/dd/aaaa no navegador de teste) | sem aparelho |
| E-mails de confirmação e de nova senha | não estão no repositório |
| PDF gerado | avaliei a prévia na tela, não o arquivo final |
| Tela "Completar cadastros" e manual (`#/ajuda`) com profundidade | entraram no inventário de estilos, mas não na leitura de texto linha a linha |
| Leitor de tela de verdade (VoiceOver) | só verificação automática de rótulos e textos alternativos |
| Área do tutor: janelas de aceitar orçamento, Pix e avaliação | medidas só as cinco abas e o aviso de privacidade |
