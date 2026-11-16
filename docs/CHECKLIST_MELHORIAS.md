# Pet Lar · Checklist único de melhorias · 2026-11-13

Junta **três fontes** em uma lista só, sem duplicatas e já separada por importância:

| Fonte | O que entrou |
|---|---|
| `docs/AJUSTES.md` (o que você já tinha) | itens abertos e pausados (A-07, C-03, C-04, F-03, F-04, C-02) |
| `RAIO-X_Pet-Lar_2026-11-13.md` | bugs, segurança, dados, desempenho (códigos Q-, S-, D-, P-, B-) |
| `AUDITORIA-FRONT_Pet-Lar_2026-11-13.md` | texto, visual, consistência, acessibilidade (códigos T-, F-, U-) |
| **Pedidos de hoje** | 4 itens novos, marcados com ⭐ |

**Atualizado em 16/11/2026 (v2.7):** ✅ feito · ◐ parcial ou depende de você · ☐ a fazer. Parciais: L-11 (glossário no manual; menus renomeados; "cliente"/"tutor" no painel não foi trocado em todas as telas); L-19 (plurais e "Preencher" feitos; resto do lote de textos fica para depois); L-21 (não feito (avisos padronizados)); L-25 (botões "x" e links maiores; revisar telas uma a uma depois); L-26 (foco visível feito; rótulos do portal já existiam; falta revisar o painel); L-07 (conferido: plano gratuito do Supabase não tem backup automático (ver relatório)); L-29 (é trabalho de dados, não de código).

**(Texto original) Nada foi executado.** Esta é só a organização. Os códigos novos são **L-01 em diante**; a coluna *Veio de* diz onde cada item aparecia antes, para você achar o detalhe nos arquivos originais.

**Como separei o que importa** (é uma proposta minha; você muda de coluna o que discordar)

| Faixa | Critério | Quantidade |
|---|---|---|
| 🔴 **Importante** | mexe em dinheiro, em preço que o cliente vê, em perda de dado, ou confunde quem usa todo dia | 12 |
| 🟡 **Vale fazer** | melhora clara de uso ou segurança, sem urgência | 20 |
| ⚪ **Pode esperar** | acabamento, arrumação de código, risco que só aparece com mais gente ou mais volume | 14 |
| ⏸️ **Pausado por decisão sua** | você já decidiu não fazer agora | 4 |
| 💡 **Ideias de futuro** | evolução, não correção | 14 |

Esforço: **P** até ~1 h · **M** meio dia · **G** mais de um dia.
Hoje o sistema tem 2 pessoas usando, 21 propostas e 27 pets. Por isso risco "para quando crescer" ficou em ⚪.

---

## 🔴 Importante

| ☐ | ID | Item | Por que está aqui | Esf. | Veio de |
|---|---|---|---|---|---|
| ✅ | L-01 ⭐ | **Desconto por opção** (quando a proposta tem 2 opções) | Preço errado vai para o cliente. Veja a nota abaixo da tabela | P/M | pedido de hoje |
| ✅ | L-02 ⭐ | **Cobrar com 2–3 dias + lista de "perto da data"** (recusadas e em aberto) | Gera serviço de verdade: quem recusou "porque ia deixar com um conhecido" costuma voltar. Veja a nota abaixo | M | pedido de hoje |
| ✅ | L-03 | Cancelar serviço apaga as parcelas em aberto e o "A receber" ignora canceladas | "A receber" fica inflado; hoje 0 casos, mas o primeiro cancelamento já erra | P | Q-02 · B-02 |
| ✅ | L-04 | Parcelas acompanham o valor quando a proposta aceita muda | Cobrança com valor antigo | M | Q-01 · B-03 |
| ✅ | L-05 | Pagamento marcado depois das 21h entra com a data de amanhã (e no mês seguinte) | Financeiro do mês errado | P | Q-03 · B-01 |
| ✅ | L-06 | Tutor não pode aceitar proposta vencida pelo link | Preço fora de validade aceito sem a Lari saber | P | Q-04 · B-04 |
| ◐ | L-07 | Conferir plano e backup do Supabase; agendar cópia semanal | Único lugar onde mora todo o histórico de clientes | P | S-07 · B-05 |
| ✅ | L-08 | **Um "Enviar" claro por estado** da proposta; rascunho só com "Terminar e enviar", sem "Aceitou/Recusou" | Foi exatamente a confusão da Larissa; hoje são 3 botões "Enviar" | M | U-03 · B-11 · F-14 · F-08 |
| ✅ | L-09 | Botão principal com contraste (terracota forte `#A9553A`) | Branco sobre o terracota atual reprova (3,79:1) em todos os botões principais | P | T-01 · F-01 |
| ✅ | L-10 | Ações rápidas ("Aceitou/Recusou/Cobrar/Adiar") maiores, em grade 2×2; botão "+ Nova proposta" sem cobrir conteúdo | É a ação mais usada do painel e o menor botão (30 px) | M | U-04 · U-05 · T-06 · F-15 · F-16 · B-16 |
| ◐ | L-11 | **Glossário único:** proposta (painel) · orçamento (só área do tutor) · tutor (nunca "cliente") · "Configurações" e "Como usar" nos dois menus | Mesma coisa com dois nomes em quase toda tela | P | T-04 · F-03 |
| ✅ | L-12 | Texto nunca abaixo de 12 px; rótulos dos cartões em marrom | ~390 trechos de 10–11,5 px, na rua, no sol | P | T-03 · F-06 |

**Nota L-01, desconto por opção** (⭐ pedido de hoje)
- **O que vi no código:** o desconto especial já é guardado **por opção** (`descManual` está entre as chaves de cada opção, `proposta.js:351`). O campo fica no quadro "4 Ajustes e recado", **longe** das abas das opções, e grava na opção que estiver aberta (`S.editando`). Depois dos atalhos de "duas opções", o editor fica na opção 2.
- **Leitura provável (não reproduzi):** não é falta de recurso, é o campo não dizer a qual opção pertence. Por isso "só vai para a 2".
- **O que faria:** mostrar "Desconto da opção 1" / "Desconto da opção 2" (os dois campos juntos ou o campo dentro de cada opção), e o resumo mostrar o desconto de cada uma.
- **Confirmar antes:** se o que você quer é também "mesmo desconto nas duas com um toque". Incluí como opção na pergunta 1 do fim.

**Nota L-02, cobrar** (⭐ pedido de hoje) — são duas coisas:
1. **Cobrar 2–3 dias depois de enviar.** Já existe em parte: Configurações → "Lembrar proposta sem resposta após (dias)" vale **2** hoje, e a aba Cobrar separa "cobrar agora" de "enviadas há pouco". Se está faltando algo, provavelmente é (a) a primeira cobrança não ser avisada com destaque no Hoje, ou (b) querer 2 dias para a 1ª e 3 para a 2ª. Anoto como **ajuste fino**; peço sua confirmação na pergunta 2.
2. **Nova lista "Reconfirmar perto da data"** (esta é nova de verdade): propostas **recusadas ou em aberto** cujo serviço começa em até 2 dias (valor ajustável em Configurações). Cada linha com: tutor, pet, serviço, data, motivo da recusa (campo opcional novo: "vai deixar com conhecido", "preço", "outro") e botão de WhatsApp com mensagem pronta tipo *"Oi, Fulana! Deu certo de alguém ficar com o Thor? Se precisar, ainda tenho vaga."* + botões "Fechou" (vira aceita) e "Deixa para lá" (some da lista).
   - Precisa de: coluna opcional `motivo_recusa` em `propostas` e uma consulta por data do serviço; sem mudança de arquitetura.

---

## 🟡 Vale fazer

| ☐ | ID | Item | Por que | Esf. | Veio de |
|---|---|---|---|---|---|
| ✅ | L-13 ⭐ | **Foto padrão do pet sem foto** mais bonita (ilustração da marca, com cor por espécie) | Aparece em 21 de 27 pets, em quase toda lista. Sobe para 🔴 se o ícone sair no PDF do cliente (vou verificar) | M | pedido de hoje |
| ✅ | L-14 ⭐ | **Trocar "Um lar de verdade"** e o "aqui em casa" da proposta | Texto que o cliente lê; você acha o termo ruim. Está em `proposta.js:421` (selo) e `:641` (recado). Sugestões na pergunta 3 | P | pedido de hoje |
| ✅ | L-15 | Registrar erros de produção numa tabela (`window.onerror`) | Hoje um erro no celular da Larissa some sem rastro | P | S-05 · B-06 |
| ✅ | L-16 | Rodar os testes automaticamente antes de cada deploy | Push na `main` publica direto | M | S-06 · B-12 |
| ✅ | L-17 | Avisar quando duas pessoas editam a mesma proposta | A última a salvar apaga a outra; Bruno e Larissa usam juntos (não reproduzido) | M | Q-05 · B-13 |
| ✅ | L-18 | Tirar "Espécie" da proposta (PDF e cartões) | Pedido seu, 13/11 | P | A-07 · B-17 |
| ◐ | L-19 | **Lote de textos:** "(s)" nos plurais, "Toque em Preencher"→"Contar", "Cliente ativo"→"Pet ativo", "ticket"→"média", "card"→"imagem", legendas e janelas da seção 3 da auditoria | Tom e correção; tudo com a reescrita pronta | P | F-02 · F-04 · F-13 |
| ✅ | L-20 | Senha mínima de 8 em todo lugar | Hoje 6 em alguns campos e 8 em outros | P | S-04 · F-05 |
| ◐ | L-21 | Avisos de sucesso e erro num padrão só; sem texto técnico em inglês | "Salvo / Atualizado ✓ / Pronto / Foto salva!" convivem | P | T-12 · T-13 · F-09 |
| ✅ | L-22 | "A Lari já foi avisada" ao tutor aceitar: mudar o texto **ou** avisar de verdade | Promessa sem lastro no código (provável) | P / G | F-21 |
| ✅ | L-23 | Link do tutor com validade e renovar com um toque | Hoje vale para sempre | M | S-03 · B-14 |
| ✅ | L-24 | Seletores de aniversário legíveis no celular | Aparece "Di" e "Não sei o" | P | U-02 · F-11 |
| ◐ | L-25 | Ações em link minúsculo viram botões ("trocar", "desfazer", "desvincular", "remover") | Alvo de 18 px; "remover acesso" parece rodapé | M | T-09 · F-17 |
| ◐ | L-26 | Rótulos para leitor de tela (marca, buscas, imagens da prévia) e foco visível no painel | Acessibilidade básica | P | A11-01..03 · F-12 · F-18 · B-10 |
| ✅ | L-27 | Cinza de apoio um tom mais escuro (`#6B5F57`) | 150 trechos no limite do contraste | P | T-02 · F-07 |
| ✅ | L-28 | Manual com rolagem lateral no celular | Tabela de versões estoura a largura | P | Q-06 · U-01 · B-07 |
| ◐ | L-29 | **Mutirão de dados:** WhatsApp de 8 tutores, vínculo de 6 propostas sem tutor, datas de 8 propostas, fotos de 21 pets, dar baixa nas 19 "enviadas" antigas | Não é código; sem isso Cobrar, Agenda e a área do tutor ficam vazias | — | C-02 · Raio-X seção 4.6 |
| ✅ | L-30 | Validade preenchida sempre (13 de 21 propostas estão sem) | "Vencida" e follow-up ficam sem base | P | D-02 · B-18 |
| ✅ | L-31 | Menu "Cobrar" → "Respostas"; botão "Cobrar (2ª)" → "Lembrar (2ª vez)" | "Cobrar" tem dois sentidos (resposta × pagamento) — **só se você topar** | P | auditoria 3.4 |
| ✅ | L-32 | Esconder "Fotos e vídeos guardados" enquanto a mídia no painel está pausada | Mostra "0 vídeos" de um recurso desligado | P | auditoria 3.11 |

---

## ⚪ Pode esperar

| ☐ | ID | Item | Por que não é urgente | Esf. | Veio de |
|---|---|---|---|---|---|
| ☐ | L-33 | CSP e HSTS nos cabeçalhos | Escape de HTML consistente nas amostras; é 2ª barreira | M | S-01 · B-15 |
| ☐ | L-34 | Aceite com duas opções em transação única | Só falha se a internet cair no meio | M | Q-07 · B-19 |
| ☐ | L-35 | Prender o foco dentro das janelas | Quase ninguém usa teclado no painel | M | A11-04 · B-20 |
| ☐ | L-36 | Escala tipográfica de 8 degraus, 3 alturas de botão, raios 12/16/999 | Arrumação; a vantagem aparece em manutenção | M | F-22 · F-23 · F-25 · T-10 · T-16 |
| ☐ | L-37 | Um arquivo de cores (`tokens.css`) para painel e área do tutor | Reduz as 66 cores soltas; só vale quando mexer em tema | G | F-24 · T-15 |
| ☐ | L-38 | Pesos de fonte que não existem (500/600/800) | O navegador já escolhe o vizinho; não se vê diferença | P | T-05 · F-10 |
| ☐ | L-39 | Título repetido no celular ("Propostas" duas vezes) | Estético | P | T-07 · F-19 |
| ☐ | L-40 | Rótulos longos em minúsculas; respeitar "movimento reduzido" | Conforto | P | F-20 · F-26 · T-08 |
| ☐ | L-41 | Apagar `logo-petlar.png` (498 KB sem uso) e enxugar o `.webp` (190 KB) | Faxina | P | P-01 · P-02 · B-09 |
| ☐ | L-42 | Cache com versão no nome dos arquivos | Hoje revalida em toda abertura; só pesa em rede ruim | M | P-03 · B-22 |
| ☐ | L-43 | Dividir `proposta.js` (1.060 linhas) em módulos | Só pesa quando for crescer a proposta | G | P-05 · B-24 |
| ☐ | L-44 | Parcelas editáveis (quantidade, valor, data) | Entra junto com pacotes recorrentes (💡) | G | D-01 · B-21 |
| ☐ | L-45 | Limpeza: código sem uso (`squareImage`, `squareBlob`), `config.toml` e redirecionamento antigo, filtro por período com 3 h de folga, contador de acessos | Poeira | P | D-03 · D-04 · S-08 · Q-08 · B-23 |
| ☐ | L-46 | Índice sem uso e policy `admins_sel` | Irrelevante com 27 pets | P | P-04 |

---

## ⏸️ Pausado por decisão sua (não mexer)

| ID | Item | Decisão |
|---|---|---|
| C-03 | Proteção de senha vazada | só existe no plano Pro; não ligar agora (10/11) |
| C-04 | Assistente × valores pela API | sem uso hoje; só Bruno e Larissa (10/11) |
| F-03 | Fotos e vídeos no painel | pelo WhatsApp por enquanto; `MIDIA_NO_PAINEL=false` (12/11) |
| F-04 | Vídeos originais em 4K | pausado junto com o anterior; rever com mais cadência |

---

## 💡 Ideias de futuro (evolução, não correção)

| Ideia | De onde veio | Motivo |
|---|---|---|
| Aviso de fim de dia por WhatsApp para o tutor | roadmap | tira trabalho da Lari |
| Link de avaliação no Google depois da nota do tutor | roadmap | hoje 0 avaliações |
| Contrato com aceite digital | roadmap | segurança jurídica |
| Checklist de entrada e saída do pet | roadmap | menos esquecimento |
| Pacotes recorrentes (passeio mensal) | roadmap | depende de L-44 |
| Carteira de vacinas | roadmap | |
| Domínio próprio e instalar como app (service worker) | roadmap | resolve L-42 de quebra |
| Aviso de foto nova no celular do tutor | AJUSTES F-01 | |
| Agenda do celular como lista de dias | auditoria | calendário de 7 colunas obriga texto de 10 px |
| Proposta passo a passo no celular | auditoria | 5 blocos numa rolagem longa |
| Levar o "jeito" da área do tutor para o painel | auditoria | é a parte mais clara |
| Página de componentes `/estilo` | auditoria | guia de padrão vivo |
| Modo escuro | auditoria | uso à noite |
| Estados vazios com os mascotes da logo | auditoria | identidade |

---

## Decisões que preciso de você (para fechar os itens acima)

| # | Pergunta | Mexe em |
|---|---|---|
| 1 | **Desconto por opção:** quer um campo de desconto dentro de cada opção, ou os dois lado a lado no quadro "Ajustes"? E um atalho "mesmo desconto nas duas"? | L-01 |
| 2 | **Cobrar:** o que falta além do que já existe (2 dias de espera, configurável)? Quer 2 dias para a 1ª cobrança e 3 para a 2ª? E a lista "perto da data": quantos dias antes (2?) e entram **recusadas e em aberto** (as expiradas também)? | L-02 |
| 3 | **"Um lar de verdade":** qual ideia você quer passar? Três caminhos para escolher: *"Dentro de casa, sem canil"* (fala da estrutura) · *"Ele fica na casa da Lari, como da família"* (fala do carinho) · *"Casa de verdade, com sofá e quintal"* (fala do conforto, se for verdade). Ou me diga as palavras | L-14 |
| 4 | Parcela de proposta aceita que muda de valor: **recalcular sozinha** ou **avisar e a Lari decide**? | L-04 |
| 5 | Proposta vencida: **bloquear** o aceite do tutor ou deixar e a Lari confirma? | L-06 |
| 6 | As 19 propostas "enviadas" estão mesmo em aberto, ou dá para dar baixa? | L-29 |
| 7 | O link do tutor pode expirar (ex.: 90 dias depois do último serviço)? | L-23 |
| 8 | Topa trocar "Cobrar" por "Respostas" no menu? | L-31 |
| 9 | A assistente pode editar dados de tutores? O 3º e-mail em `admins` (sem conta) fica? | decisão simples |

---

## Sugestão de ordem (quando você mandar executar)

| Lote | Itens | Tamanho | Resultado |
|---|---|---|---|
| **1 · Dinheiro certo** | L-03, L-04, L-05, L-06 (+ L-07 você confere no painel do Supabase) | meio dia | Financeiro e aceite sem erro silencioso |
| **2 · Seus pedidos** | L-01, L-02, L-13, L-14 (depois das respostas 1–3) | 1–2 dias | desconto por opção, cobrança por data, foto padrão, texto novo |
| **3 · Clareza** | L-08, L-09, L-10, L-11, L-12, L-19, L-20 | 1 dia | proposta sem dúvida, contraste e texto legíveis, nomes iguais |
| **4 · Rede de segurança** | L-15, L-16, L-17, L-23 | meio dia | erros visíveis, testes no deploy, edição simultânea |
| **5 · Arrumação** | L-21, L-22, L-24 a L-32 | 1 dia | o resto dos 🟡 |
| **Quando der** | ⚪ e 💡 | — | sem pressa |

L-29 (mutirão de dados) pode rodar em paralelo a qualquer lote, é trabalho seu e da Lari usando "Completar cadastros".
