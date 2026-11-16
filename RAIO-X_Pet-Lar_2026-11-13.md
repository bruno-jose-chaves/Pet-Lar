# RAIO-X · Pet Lar · 2026-11-13

Auditoria **somente de leitura** do painel da Pet Lar (versão no ar: **v2.6**) e da área do tutor.
Nada foi alterado em código, banco, configuração ou deploy. No banco só rodei `select` de contagem (sem dados pessoais).

**Como ler a confiança de cada item**

| Rótulo | Significa |
|---|---|
| **confirmado** | vi acontecer na tela, ou li o trecho exato do código/banco que causa |
| **provável** | o código aponta para isso, mas não reproduzi de ponta a ponta |
| **hipótese** | suspeita que precisa de teste em aparelho real ou no painel do fornecedor |

**De onde veio cada evidência**

| Fonte | O que cobre |
|---|---|
| Código local (`/home/claude/pet-lar`, commit `25b74b6`) | leitura de `public/js`, `supabase/functions`, `supabase/migrations`, `tests` |
| Banco de produção (Supabase `pet-lar`), só leitura | RLS, policies, funções, triggers, grants, advisors de segurança/performance, contagens |
| Site no ar (`propostas.petlar.workers.dev`), sem login | cabeçalhos, tamanhos, rotas inexistentes, versão publicada |
| Varredura de telas com banco simulado (Chromium, 390×844 e 1280) | todas as rotas, console e rede capturados, prints |

---

## 1. Resumo executivo

**Nota geral: 7,5 / 10.**
Para um sistema de uma pet sitter com 2 logins, está acima do esperado: permissões por papel bem fechadas no banco, 328 verificações automáticas, nenhuma tela quebrada e nenhum erro de console na varredura. Perde ponto em três frentes: **dinheiro que pode ficar errado sem aviso** (parcelas não acompanham a proposta), **falta de rede de segurança** (sem backup conferido, sem monitoramento de erro, sem CI) e **acabamento no celular** em alguns pontos.

### Os 5 problemas mais graves

| # | Problema | Confiança |
|---|---|---|
| 1 | **Parcelas não acompanham a proposta depois do aceite.** Mudar o valor de uma proposta aceita, ou cancelar o serviço, deixa Sinal/Saldo antigos em aberto; o "A receber" do painel soma tudo que está em aberto, inclusive de serviço cancelado. (Q-01, Q-02) | confirmado no código; hoje **0 casos** no banco |
| 2 | **Pagamento marcado depois das 21h entra com a data do dia seguinte** (usa a data em UTC). Perto da virada do mês, cai no mês errado do Financeiro. (Q-03) | confirmado no código |
| 3 | **O tutor consegue aceitar proposta vencida** pelo link: nem a função do portal nem a tela conferem a validade. (Q-04) | confirmado no código |
| 4 | **Sem rede de segurança operacional**: não há registro de erros em produção, não há CI rodando os testes antes do deploy, e backup/pausa do banco não foram conferidos (plano gratuito, provável). (S-05, S-06, S-07) | confirmado (erros, CI) · provável (backup) |
| 5 | **Dois logins editando a mesma proposta se sobrescrevem** sem aviso (salvamento automático grava por cima, sem conferir versão). Hoje Bruno e Larissa usam ao mesmo tempo. (Q-05) | confirmado no código; não reproduzi com 2 sessões |

### As 3 melhorias de maior retorno

1. **Sincronizar parcelas com a proposta** (recalcular parcelas em aberto quando o valor muda; apagar/zerar as abertas no cancelamento). A função `apagarPagamentosAbertos` já existe em `public/js/db.js:202` e não é usada em lugar nenhum.
2. **Trocar a data UTC pela data local** em `marcarPago` (`public/js/db.js:169`) — uma linha, elimina o erro de mês.
3. **Captura de erros + CI mínimo**: um `window.onerror`/`unhandledrejection` gravando em uma tabela `erros`, e um GitHub Action que roda os 3 testes antes do deploy. Hoje um erro no celular da Larissa some sem deixar rastro.

---

## 2. Mapa do sistema

### Stack

| Camada | O que é |
|---|---|
| Front | SPA estática, JavaScript puro em módulos ES, roteador por hash, **sem build** e sem `package.json` |
| Bibliotecas (cópias locais em `public/vendor`) | supabase-js (220 KB), jsPDF (366 KB), html2canvas (199 KB), qrcode |
| Hospedagem | Cloudflare Worker `propostas` servindo `./public`; deploy automático a cada push na `main` |
| Banco / login / arquivos | Supabase `pet-lar`: Postgres com RLS, Auth por e-mail e senha, bucket privado `pets` |
| Funções de servidor | Edge Functions `portal` (área do tutor, por token) e `admin-senha` (senha provisória) |
| Testes | Playwright em Python: `test_app.py` (203), `test_portal.py` (104), `test_precos.py` (21), `test_perf.py`, `telas.py` |
| Tamanho | `public/` 2,4 MB · ~6.200 linhas · maior arquivo `js/pages/proposta.js` (85 KB, 1.060 linhas) |

### Arquitetura em uma frase

Navegador fala direto com o Supabase usando a chave pública; **quem decide o que cada pessoa vê é o banco** (RLS por papel, via `private.papel()`, `tem_acesso()`, `e_gestao()`, `e_admin()`). A área do tutor não tem login: um link com token de 192 bits chama a Edge Function `portal`, que usa a chave de serviço e devolve só os dados daquele tutor.

### Telas e rotas (`public/js/app.js:10-26`)

| Rota | Tela | Quem acessa |
|---|---|---|
| `#/hoje` | Painel do dia | todos |
| `#/propostas`, `#/proposta/nova`, `#/proposta/:id` (`/duplicar`, `/enviar`) | Lista e editor de propostas | só gestão |
| `#/pets`, `#/pet/:id` | Pets e ficha | todos |
| `#/tutores`, `#/tutor/:id` | Tutores | todos |
| `#/agenda` | Agenda | todos |
| `#/financeiro`, `#/cobrar` | Financeiro e cobranças | só gestão |
| `#/diario/:id` | Diário do serviço | todos |
| `#/completar` | Completar cadastros | só gestão |
| `#/config`, `#/ajuda` | Configurações e manual | todos |
| `/t/#token` (`?aba=`) | Área do tutor: Início, Diário, Fotos, Pets, Mais | quem tem o link |

### Funcionalidades

| Funcionalidade | Estado | Observação |
|---|---|---|
| Login, troca de senha, senha provisória | ✅ | não testado no ar (não digito senhas) — ver Lacunas |
| Proposta: montar, calcular, 2 opções, PDF, enviar por WhatsApp | ✅ | 203 verificações passando |
| Rascunho × enviada (passo 5) | ✅ | |
| Aceite pelo painel e pelo tutor | ⚠️ | funciona; aceita proposta vencida (Q-04) |
| Parcelas Sinal/Saldo 50/50 | ⚠️ | criadas no aceite; não se atualizam depois (Q-01, Q-02) |
| Financeiro (a receber, recebido no mês) | ⚠️ | data do pagamento pode cair no dia seguinte (Q-03) |
| Cobrança / follow-up | ✅ | |
| Agenda | ✅ | |
| Pets, tutores, enquadrar foto | ✅ | seletores de aniversário cortados a 390 px (U-02) |
| Diário do serviço (notas) | ✅ | |
| Fotos e vídeos no painel | 🚧 | pausado de propósito (`MIDIA_NO_PAINEL=false`); código guardado |
| Área do tutor | ✅ | link não expira (S-03) |
| Avaliação do serviço pelo tutor | ✅ | 0 avaliações registradas até hoje |
| Completar cadastros | ✅ | muita coisa a completar — ver seção 4.6 |
| Manual dentro do painel | ⚠️ | tabela de versões estoura a largura no celular (U-01) |
| Uso offline / instalar como app | ❌ | não existe service worker nem manifest |
| Backup, monitoramento, CI | ❌ | não existem ou não conferidos |

---

## 3. O que está quebrado

| ID | Problema | Onde | Como reproduzir | Causa provável | Severidade | Confiança |
|---|---|---|---|---|---|---|
| Q-01 | Editar o valor de uma proposta **aceita** não atualiza Sinal/Saldo | `public/js/pages/proposta.js:840-849` (salvar) · `supabase/migrations/20261110140911_petlar_schema_v1.sql:159-171` | Aceitar proposta de R$ 400 → mudar para R$ 500 e salvar → Financeiro segue com 200 + 200 | O gatilho só cria parcelas quando ainda não existe nenhuma; o salvar não mexe em `pagamentos` | Alta | confirmado (leitura); 0 casos no banco hoje |
| Q-02 | "Cancelar serviço" deixa as parcelas em aberto, e elas continuam no "A receber" | `proposta.js:866-874` (`setStatus`) · função `painel_resumo` (campo `a_receber`) · `public/js/db.js:162-163` | Aceitar → Cancelar serviço → olhar Painel/Financeiro | Nenhum ponto apaga parcelas; `a_receber` soma todo `pagamentos` com `pago_em` nulo, sem olhar o status | Alta | confirmado (leitura); 0 casos hoje |
| Q-03 | Pagamento marcado após ~21h fica com data de amanhã | `public/js/db.js:169` | Marcar "pago" às 22h de um dia 30/31 → aparece no mês seguinte | `new Date().toISOString().slice(0,10)` devolve a data em UTC (Brasil = UTC−3) | Média | confirmado (leitura) |
| Q-04 | Tutor aceita proposta já vencida | `supabase/functions/portal/index.ts:144-157` · `public/js/portal.js` (botão aparece em "vencida") | Abrir o link do tutor com proposta cuja validade passou → "Aceitar" funciona | A ação `aceitar` só confere `status = 'enviada'`; não lê `validade_ate` | Média | confirmado (leitura) |
| Q-05 | Duas pessoas editando a mesma proposta: a última a salvar apaga o que a outra fez | `proposta.js:845` (`updateProposta` por id, sem condição) | Bruno e Larissa abrem a mesma proposta e editam campos diferentes | Salvamento automático grava a linha inteira (`payload` incluso), sem controle de versão | Média | confirmado (leitura); não reproduzido com 2 sessões |
| Q-06 | Manual tem rolagem lateral no celular | `#/ajuda`, tabela "Histórico de versões" | Abrir Ajuda em 390 px → a página arrasta para o lado (393 px) | Tabela com 379 px de largura sem contêiner com rolagem própria | Baixa | confirmado (varredura) |
| Q-07 | Aceite com 2 opções grava em duas etapas | `public/js/acoes.js:66-83` · `proposta.js:845-847` | Cair a internet entre as duas chamadas | `update` da proposta e `setPropostaPets` são chamadas separadas (não é transação) | Baixa | provável |
| Q-08 | Filtros por período podem errar em até 3 h na virada do dia | `public/js/db.js` (filtros comparam `created_at` com data local em texto) | Proposta criada entre 21h e 0h, filtrar por "hoje" | Coluna com fuso × texto de data sem fuso | Baixa | provável |

Na varredura das telas (todas as rotas, celular e desktop) **não houve erro de JavaScript nem requisição com falha**; 51 requisições, 16 arquivos na primeira carga.

---

## 4. Achados por área

### 4.1 Segurança

| ID | O quê | Onde | Por que importa | Como resolver | Confiança |
|---|---|---|---|---|---|
| S-01 | Não há `Content-Security-Policy` nem HSTS | `public/_headers` | O painel injeta HTML por template; o escape com `esc` está consistente nas amostras (ações, diário, hoje, tutor, financeiro, portal), mas CSP é a segunda barreira se um dia escapar algo | Adicionar CSP restrita ao próprio site + `*.supabase.co`; adicionar `Strict-Transport-Security` | confirmado |
| S-02 | `email_autorizado` pode ser chamada sem login | função `public.email_autorizado` (SECURITY DEFINER, `anon`) · usada em `public/js/app.js:131` | Permite a um estranho testar se um e-mail tem acesso ao painel | Aceitável no tamanho atual; se quiser fechar, mover a conferência para dentro do cadastro (gatilho) e devolver sempre a mesma resposta | confirmado (advisor) |
| S-03 | Link do tutor nunca expira e não há limite de tentativas | tabela `tutor_acessos` (`expira_em` nulo no único acesso existente) · `portal/index.ts:31-33` | Quem tiver o link (print, celular emprestado) vê telefone, endereço e pets para sempre. O token em si é forte (24 bytes aleatórios, `db.js:234`) | Expiração padrão (ex.: 90 dias após o último serviço) e renovação com um toque; já existe "revogar" | confirmado |
| S-04 | Proteção contra senha vazada desligada; mínimo de senha pode ser 6 | Supabase Auth (advisor) · `supabase/config.toml` (`minimum_password_length = 6`, tela exige 8) | Senha fraca num sistema com dados de clientes | Item C-03 já pausado por você; ao retomar, alinhar mínimo em 8 no servidor | confirmado (advisor) · hipótese (valor remoto do mínimo) |
| S-05 | Sem registro de erros em produção | nenhum `window.onerror` / `unhandledrejection` em `public/js`; ~18 `catch` vazios (`proposta.js` 11, `pet.js` 4, `hoje.js` 3) | Um erro no celular da Larissa não chega até você | Handler global gravando em tabela `erros` (mensagem, rota, versão, papel) | confirmado |
| S-06 | Sem CI: os testes só rodam quando alguém lembra | não existe `.github/` | Push na `main` publica direto; um erro passa para produção | GitHub Action rodando os 3 testes; deploy só se passar | confirmado |
| S-07 | Backup e pausa por inatividade não conferidos | painel do Supabase (não acessado) | Em plano gratuito não há backup diário e o projeto pausa após inatividade; todo o histórico de clientes mora ali | Conferir o plano; agendar exportação semanal (dump) para o Drive | provável |
| S-08 | Cadastro aberto na configuração do repositório | `supabase/config.toml` (`enable_signup = true`) · lista de redirecionamento ainda com o endereço antigo `propostas.brunojosechavescarvalho.workers.dev` | Qualquer um cria conta; **sem papel na tabela `admins` o RLS não mostra nada**, então o risco é baixo, mas é ruído | Conferir no painel se o remoto bate; tirar o endereço antigo | confirmado (arquivo) · hipótese (remoto) |
| S-09 | Assistente pode editar dados de tutores | policies `tutores_upd`, `pets_upd`, `diario_*` (qualquer papel com acesso) | Pode ser intencional; vale decidir | Se não for desejado, restringir `tutores_upd` à gestão | confirmado |
| S-10 | Existe um 3º e-mail em `admins` sem conta criada (2 contas, 3 autorizados) | tabela `admins` | Autorização "dormindo": quem controlar aquele e-mail entra | Confirmar se é de propósito; senão remover | confirmado |

**O que está bem resolvido (confirmado):** RLS ligado nas 10 tabelas, todas as policies só para `authenticated` e passando pelas funções de papel; `anon` sem policy nenhuma; bucket privado com URL assinada de 1 h; `admin-senha` confere o papel no banco antes de agir; caminhos inexistentes (`/.git/config`, `/robots.txt`) devolvem só o `index.html`, sem vazar arquivo; endereços antigos fora do ar; dados de clientes fora do Git.

### 4.2 Dados e regras de negócio

| ID | O quê | Onde | Por que importa | Como resolver | Confiança |
|---|---|---|---|---|---|
| D-01 | Parcelas são sempre 50/50, hoje + data final | gatilho `tg_proposta_aceita` | Serviço de 1 visita ou pacote mensal pode pedir outra divisão | Deixar editar parcelas na proposta aceita (valor, data, quantidade) | confirmado |
| D-02 | 13 de 21 propostas sem validade | `proposta.js:843` (só calcula se houver data da proposta) | "Vencida" e follow-up ficam sem base | Preencher validade a partir da data de envio quando faltar | confirmado (contagem) |
| D-03 | Funções guardadas que ninguém chama | `db.js:202` (`apagarPagamentosAbertos`), `squareImage` em `proposta.js:509`, `U.squareBlob` | Confunde manutenção | Usar a primeira em Q-02; apagar as outras | confirmado |
| D-04 | Contador de acessos do tutor sobe a cada carregamento | `portal/index.ts:95` | Número não representa "visitas" | Contar no máximo 1 por hora, ou renomear | confirmado |

### 4.3 Usabilidade (celular 390 px e desktop)

| ID | O quê | Onde | Por que importa | Como resolver | Confiança |
|---|---|---|---|---|---|
| U-01 | Rolagem lateral no manual | `#/ajuda` | = Q-06 | Envolver a tabela em contêiner com `overflow-x:auto` | confirmado |
| U-02 | Seletores de aniversário cortados ("Di", "Não sei o") | `#/pet/:id` a 390 px | Campo novo e opcional fica ilegível | Empilhar em 2 linhas ou encurtar rótulos ("Dia", "Mês", "Ano?") | confirmado (print) |
| U-03 | Três botões "Enviar" na mesma tela e "Enviar" ainda aparece em proposta aceita | editor de proposta (topo, barra fixa, passo 5) | Era justamente a dúvida da Larissa: qual é o que vale? | Um único botão principal por estado; em aceita trocar por "Reenviar PDF" | confirmado (print) |
| U-04 | "Adiar" quebra sozinho para a segunda linha | ações rápidas na lista de propostas, 390 px | Parece erro de layout | 4 botões em grade 2×2 ou ícone + texto curto | confirmado (print) |
| U-05 | Alvos de toque menores que 36 px | Propostas (15), Hoje (6), proposta/pet (4), config (3) | Erro de toque no celular, principal aparelho de uso | Altura mínima de 40–44 px nos botões de ação rápida | confirmado (medição) |
| U-06 | Datas aparecem como mm/dd/aaaa | campos `type="date"` no navegador de teste | Em iPhone em português deve sair dd/mm; vale conferir | Testar no aparelho real | hipótese |

### 4.4 Acessibilidade

| ID | O quê | Onde | Como resolver | Confiança |
|---|---|---|---|---|
| A11-01 | Link da marca sem nome acessível (imagem com `alt=""`) | cabeçalho no celular, todas as telas | `aria-label="Pet Lar — início"` | confirmado |
| A11-02 | Campo de busca sem rótulo | `#/propostas` | `aria-label="Buscar proposta"` | confirmado |
| A11-03 | 2 imagens sem `alt` | prévia da proposta | `alt` com o nome do pet | confirmado |
| A11-04 | Janelas (modais) não prendem o foco nem devolvem ao botão de origem | `modal()` em `public/js/ui.js` | Foco no primeiro campo ao abrir, Tab em ciclo, devolver ao fechar | confirmado (leitura) |

Pontos positivos: um `h1` por tela, `lang="pt-BR"`, avisos (`toast`) com `textContent`.

### 4.5 Desempenho

| ID | O quê | Onde | Por que importa | Como resolver | Confiança |
|---|---|---|---|---|---|
| P-01 | `logo-petlar.png` (498 KB) não é usado em lugar nenhum | `public/assets/` | Peso morto no repositório e no deploy | Apagar | confirmado |
| P-02 | Logo em uso tem 190 KB | `public/assets/logo-petlar.webp` | É a maior imagem da primeira carga | Reexportar em ~40 KB no tamanho exibido | confirmado |
| P-03 | JS e CSS com `no-cache` (revalida a cada abertura) | `public/_headers` | 16 idas ao servidor em toda abertura; em 3G lento o painel fica pronto em ~5,9 s | Nome de arquivo com versão (`app.v26.js`) + cache longo; ou um service worker simples | confirmado (teste de 3G lento + CPU 4×) |
| P-04 | Policy `admins_sel` reavalia função por linha; índice `pets_nome_trgm` sem uso | banco (advisor de performance) | Irrelevante com 3 linhas / 27 pets; anotar para depois | `(select ...)` na policy; avaliar o índice quando houver volume | confirmado |
| P-05 | `proposta.js` com 1.060 linhas num arquivo só | `public/js/pages/proposta.js` | Não é lentidão (abre em 2,8 s no cenário lento); é risco de manutenção: cálculo, tela, PDF e salvamento juntos | Separar cálculo (já testado em `test_precos.py`), PDF e salvamento em módulos | confirmado |

Bibliotecas de PDF já carregam só quando precisam, texto vai comprimido (brotli) e `vendor` tem cache de 30 dias.

### 4.6 Qualidade dos dados em produção (contagens de hoje)

| Indicador | Valor | Leitura |
|---|---|---|
| Propostas | 21 (19 enviadas, 2 aceitas) | 0 recusadas, 0 rascunhos: ou tudo está em aberto de verdade, ou falta dar baixa nas antigas |
| Propostas sem tutor vinculado | 6 | vieram da importação; ficam fora da área do tutor |
| Enviadas/aceitas sem data de serviço | 8 | não entram em Agenda nem em "próximos 7 dias" |
| Tutores sem WhatsApp | 8 de 14 | cobrança e envio dependem disso |
| Pets sem foto | 21 de 27 | proposta e área do tutor perdem o apelo |
| Pets sem tutor | 10 de 27 | |
| Avaliações | 0 | recurso ainda não foi usado |
| Acessos de tutor criados | 1 | área do tutor ainda não entrou na rotina |
| Arquivos | 6 (724 KB) · banco 12 MB | armazenamento longe de ser problema |

O sistema está à frente do uso: a tela "Completar cadastros" existe e resolve boa parte disso; falta entrar na rotina.

---

## 5. Backlog priorizado

Ordenado por impacto ÷ esforço. Esforço: **P** até ~1 h · **M** meio dia · **G** mais de um dia.

| ID | Item | Onde | Por quê | Impacto | Esforço | Prioridade |
|---|---|---|---|---|---|---|
| B-01 | Data local em `marcarPago` | `public/js/db.js:169` | Q-03: pagamento no dia/mês errado | 4 | P | P0 |
| B-02 | Cancelar serviço apaga parcelas em aberto (e `a_receber` ignora canceladas) | `proposta.js` `setStatus` · `painel_resumo` · `db.js:202` | Q-02: "A receber" inflado | 5 | P | P0 |
| B-03 | Recalcular parcelas em aberto quando o valor de proposta aceita muda (com aviso na tela) | `proposta.js` `doSave` | Q-01: cobrança com valor antigo | 5 | M | P0 |
| B-04 | Conferir validade no aceite do tutor e esconder o botão em proposta vencida | `portal/index.ts:144` · `portal.js` | Q-04 | 3 | P | P0 |
| B-05 | Conferir plano/backup do Supabase e agendar exportação semanal | painel Supabase | S-07: único lugar onde os dados moram | 5 | P | P0 |
| B-06 | Captura global de erros em tabela `erros` | `public/js/app.js`, `portal.js` | S-05 | 4 | P | P1 |
| B-07 | Rolagem da tabela de versões no manual | `ajuda.js` / CSS | Q-06 | 2 | P | P1 |
| B-08 | Seletores de aniversário legíveis a 390 px | `pet.js` / CSS | U-02 | 2 | P | P1 |
| B-09 | Apagar `logo-petlar.png` e enxugar o `.webp` | `public/assets` | P-01, P-02 | 2 | P | P1 |
| B-10 | Rótulos acessíveis (marca, busca, imagens da prévia) | `app.js`, `propostas.js`, `proposta.js` | A11-01 a 03 | 2 | P | P1 |
| B-11 | Um único "Enviar" por estado; sem "Enviar" em aceita | `proposta.js` | U-03, dúvida real da Larissa | 4 | M | P1 |
| B-12 | GitHub Action com os 3 testes antes do deploy | `.github/workflows` | S-06 | 4 | M | P1 |
| B-13 | Aviso de edição simultânea (comparar `updated_at` antes de salvar) | `proposta.js` `doSave` · `db.js` | Q-05 | 3 | M | P1 |
| B-14 | Expiração padrão do link do tutor + renovar com um toque | `tutor_acessos` · `portal/index.ts` | S-03 | 3 | M | P1 |
| B-15 | CSP e HSTS | `public/_headers` | S-01 | 3 | M | P1 |
| B-16 | Botões de ação rápida com 40–44 px e grade 2×2 | CSS de `propostas`/`hoje` | U-04, U-05 | 3 | M | P1 |
| B-17 | Remover "Espécie" da proposta (A-07, já anotado) | `proposta.js` | pedido seu | 2 | P | P1 |
| B-18 | Validade preenchida quando faltar | `proposta.js:843` | D-02 | 2 | P | P2 |
| B-19 | Aceite em transação única (RPC `aceitar_proposta`) | `acoes.js:66-83` · banco | Q-07 | 2 | M | P2 |
| B-20 | Foco preso e devolvido nos modais | `ui.js` `modal()` | A11-04 | 2 | M | P2 |
| B-21 | Parcelas editáveis (quantidade, valor, data) | `proposta.js` · `pagamentos` | D-01 | 3 | G | P2 |
| B-22 | Cache com versão no nome dos arquivos | `_headers` + script de publicação | P-03 | 2 | M | P2 |
| B-23 | Limpar código sem uso (`squareImage`, `squareBlob`) e alinhar `config.toml` com o remoto | `proposta.js:509`, `ui.js`, `supabase/config.toml` | D-03, S-08 | 1 | P | P2 |
| B-24 | Dividir `proposta.js` em cálculo / tela / PDF / salvamento | `public/js/pages/proposta.js` | P-05 | 3 | G | P2 |
| B-25 | Decidir: assistente edita tutores? 3º e-mail em `admins` fica? | banco | S-09, S-10 | 2 | P | P2 |

Continuam pausados por decisão sua e **fora** desta lista: fotos/vídeos no painel (F-03, F-04), C-03 e C-04.

---

## 6. Roadmap futuro

### Agora (próximas 2 semanas) — dinheiro certo e rede de segurança
- B-01 a B-05: parcelas coerentes, data certa, aceite respeitando validade, backup conferido.
- B-06: saber quando algo quebra.
- Mutirão de dados usando "Completar cadastros": WhatsApp dos 8 tutores, vínculo das 6 propostas sem tutor, datas das 8 propostas sem data.

### Próximos 3 meses — tirar trabalho da Larissa
- Polimento de celular (B-07, B-08, B-11, B-16) e CI (B-12).
- Aviso de fim de dia por WhatsApp para o tutor (já estava no mapa).
- Link de avaliação no Google logo depois da nota do tutor (hoje 0 avaliações: precisa de empurrão dentro do fluxo).
- Parcelas editáveis e pacotes recorrentes (passeio mensal) — os dois pedem o mesmo alicerce (B-21).
- Contrato com aceite digital junto do aceite da proposta.

### Depois — quando houver cadência
- Fotos e vídeos dentro do painel (retomar F-03/F-04 com plano de armazenamento).
- Carteira de vacinas e checklist de entrada/saída.
- Domínio próprio e instalar como app (service worker; resolve P-03 de quebra).
- Dividir `proposta.js` (B-24) antes de crescer em recursos de proposta.

---

## 7. Lacunas e perguntas

### O que não consegui acessar ou verificar

| Lacuna | Motivo | O que fazer |
|---|---|---|
| Site no ar **com login** | Não digito senhas; toda a varredura de telas foi com banco simulado | Você navegando com o console aberto por 10 min, ou uma conta de teste |
| Configuração real do Supabase Auth (cadastro aberto, mínimo de senha, redirecionamentos) | Só li o `config.toml` do repositório | Conferir no painel |
| Plano, backup e pausa do projeto Supabase | Não consultei cobrança/plano | Conferir no painel (B-05) |
| iPhone real: enquadrar foto com dois dedos, formato de data, teclado sobre a barra fixa | Sem aparelho; WebKit de teste falhou só no print da página do manual (limite de altura da ferramenta) | Teste de 5 min no iPhone |
| Edição simultânea (Q-05) e queda de rede no aceite (Q-07) | Exigiria gravar dados; fora do combinado de somente leitura | Posso testar em banco simulado se quiser |
| Logs do Cloudflare e das Edge Functions | Não consultados | Olhar se houver suspeita de erro em produção |
| PDF gerado em produção com dados reais | Não gerei | Conferir 1 proposta real impressa |

### Perguntas para você

1. Quando uma proposta aceita muda de valor, a parcela em aberto deve **recalcular sozinha** ou só **avisar** e deixar a Larissa decidir?
2. Proposta vencida: o tutor deve ser **bloqueado** ou pode aceitar e a Larissa confirma?
3. As 19 propostas "enviadas" estão mesmo em aberto, ou falta dar baixa (recusada/expirada) nas importadas?
4. A assistente deve poder editar dados de tutores? E o 3º e-mail autorizado sem conta, é para manter?
5. O link do tutor pode expirar (ex.: 90 dias depois do último serviço)?
6. O modelo de auditoria veio com os campos em branco (fluxos críticos, dores conhecidas). Assumi como críticos: **montar/enviar proposta, aceite, parcelas e área do tutor**. Tem outro fluxo que eu deveria ter priorizado?
