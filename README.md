# Pet Lar · Painel (v1.5)

Sistema da Pet Lar para a Larissa usar no celular: **propostas** (PDF, imagem, WhatsApp e Pix), **tutores**, **pets**, **agenda** e **financeiro**.

- **Site:** https://propostas.petlar.workers.dev (Cloudflare Worker `propostas`, conta com subdomínio `petlar`).
- **Banco:** Supabase, projeto `pet-lar` (São Paulo), com login e fotos privadas.
- **Publicação:** todo `git push` na `main` publica o site sozinho (Workers Builds) e o Supabase aplica as migrações novas de `supabase/migrations` (integração GitHub).
- **Backlog de ajustes:** `docs/AJUSTES.md` (pedidos para depois do MVP; cópia no Obsidian).
- **Manual de uso:** `public/manual.md`, aberto dentro do painel em **Como usar** (`#/ajuda`). A mesma nota fica no Obsidian. **Atualize os dois a cada mudança.**

---

## Telas

| Tela | O que faz |
|---|---|
| **Hoje** | Serviços do dia, próximos 7 dias, propostas sem resposta (botão "Lembrar" no WhatsApp) e indicadores (a receber, recebido no mês, aguardando) |
| **Propostas** | Funil por status (rascunho → enviada → aceita/recusada), busca, taxa de aceite e paginação |
| **Proposta** | Gerador com a tabela v2.3. **Salva sozinho**, numera (PL-2026-001), vincula tutor e pets do cadastro, guarda foto e ficha do pet. **Enviar**: PDF, imagem (card), mensagem pronta e conversa no WhatsApp. Quando a proposta é aceita, lança **sinal e saldo (50/50)** no financeiro. Menu com aceitar, recusar, duplicar e excluir |
| **Pets** | Com a Lari agora · Próximos (60 dias) · Todos. A ficha tem foto, alimentação, remédios, comportamento, limitações, veterinário e histórico |
| **Tutores** | Lista e ficha: contato, endereço (link para o mapa), pets, propostas e quanto já contratou. Botão de nova proposta já preenchida |
| **Agenda** | Mês com hospedagens, visitas e banhos. **Alerta de lotação** acima da capacidade de hóspedes |
| **Financeiro** | A receber, vencido (com lembrete no WhatsApp), recebido no mês e receita por serviço. "Recebi" com Pix, dinheiro ou cartão |
| **Cobrar** | Enviadas sem resposta: cobrar agora, recentes, adiadas e antigas. Cobrança no WhatsApp com mensagem que muda a cada vez, registro (`cobrancas`, `cobrada_em`, `lembrar_em`) e contador no menu |
| **Diário** | Registros com um toque durante o serviço (comeu, passeou, remédio, foto, recado), linha do tempo por dia, resumo para o WhatsApp. Tabela `diario`, fotos em `pets/diario/` |
| **Como usar** | Manual de uso dentro do painel (lê `manual.md`) |
| **Configurações** | Chave Pix (QR do sinal no PDF + copia e cola na mensagem), contato, capacidade, dias para follow-up, **quem tem acesso**, trocar senha |

## Acesso e níveis
| Nível | O que pode |
|---|---|
| **Administrador** (Bruno) | Tudo, inclusive dar, mudar e tirar acessos |
| **Gestora** (Larissa) | Todo o negócio: propostas, valores, financeiro, Pix, configurações. Não mexe em acessos |
| **Assistente** | Hoje, Agenda, Pets e Tutores; edita fichas e fotos. Não vê valores, propostas, financeiro nem Pix. Proposta aceita abre como “Serviço” (sem valores) |

As regras valem no banco (RLS por papel em `admins.papel`), não só nas telas. Sempre existe pelo menos um administrador (gatilho).

1. O e-mail precisa estar liberado em **Configurações → Quem tem acesso** (só o administrador vê esse painel). Os dois e-mails do Bruno já vêm liberados como administrador.
2. No site, a pessoa digita o e-mail, cria uma senha e toca em **Primeiro acesso**.
3. Ela confirma pelo link que chega no e-mail e depois entra com e-mail e senha.

---

## Estrutura

```
public/
  index.html            casca do app (esqueleto de carregamento)
  css/gerador.css       estilos do gerador, do A4 e do card (fontes próprias)
  css/app.css           estilos do painel
  js/app.js             roteador (#/hoje, #/propostas…), login e menu
  js/db.js              todas as consultas ao Supabase (tempo-limite de 20 s, cache curto)
  js/filtros.js         barra de filtros padrão (salva no aparelho)
  js/acoes.js           ações rápidas (aceitar, recusar, cobrar, adiar) e grupos de cobrança
  js/ui.js              utilitários (formatação, modal, toast, compartilhar)
  js/pix.js             Pix copia e cola (BR Code do Banco Central) + QR
  js/pages/*.js         uma tela por arquivo, carregada só quando abre
  vendor/               supabase-js, html2canvas, jsPDF, qrcode (sem CDN de terceiros)
  fonts/                Lato e Playfair (só os pesos usados)
tests/
  test_app.py           fluxo completo (157 verificações, inclui níveis de acesso) com banco simulado · webkit e chromium
  test_precos.py        tabela de preços (21 casos)
  test_perf.py          3G lento + CPU 4x mais lenta
  fake-supabase.js      Supabase em memória para os testes
supabase/
  config.toml           configuração do projeto (integração GitHub)
  migrations/           histórico do banco, uma migração por mudança (fonte da verdade)
wrangler.jsonc          Worker de arquivos estáticos (pasta public/)
```

## Banco (Supabase)
`tutores` → `pets` · `propostas` (+ `proposta_pets`) → `pagamentos` · `settings` · `admins`
- **Segurança (RLS):** só e-mails da tabela `admins` entram, e cada papel tem as suas permissões (`private.tem_acesso()`, `private.e_gestao()`, `private.e_admin()`). Fotos ficam em armazenamento **privado**, com links temporários.
- **Gatilhos:** numeração anual sem buracos, data de envio e de resposta, sinal e saldo automáticos ao aceitar.
- **Índices** para status, período, tutor, pagamentos em aberto e busca por nome.
- `painel_resumo()` monta todos os números da tela Hoje numa chamada só.

## Desempenho (aplicado das 31 dicas)
Telas com esqueleto de carregamento · cada tela carrega só o código dela · bibliotecas de PDF só ao gerar · imagens WebP e `loading="lazy"` · fontes próprias com só os pesos usados · CDN e compressão da Cloudflare · cache longo para fontes e bibliotecas · busca com debounce · listas paginadas · consultas só com as colunas usadas · requisições em paralelo · tempo-limite nas chamadas · índices no banco · atualização otimista (status, "recebi") · teste em rede lenta.
Medido no 3G lento com CPU 4x mais lenta: esqueleto em 0,6 s, painel pronto em cerca de 4 s.

## Rodar os testes
```bash
pip install playwright && python -m playwright install chromium webkit
python tests/test_app.py webkit && python tests/test_app.py chromium
python tests/test_precos.py
python tests/test_perf.py
```

## Onde mudar
| O quê | Onde |
|---|---|
| Preços e regras | `js/pages/proposta.js`, constante `T` (tabela v2.3) |
| Textos do que está incluso | `incVisita`, `incHosp`, `incBanho` em `proposta.js` |
| Pix, contato, capacidade | tela **Configurações** (sem código) |
| Cores e fontes | `:root` em `css/gerador.css` |
| Manual de uso | `public/manual.md` (e a nota do Obsidian) |
| Mudança no banco | nova migração em `supabase/migrations/AAAAMMDDHHMMSS_nome.sql` e `git push` |

## Duas opções, valor combinado e orçamentos importados
- **Duas opções:** `S.alt` guarda os campos de serviço da outra opção (`SVC_KEYS`); `withOpt(n, fn)` calcula qualquer opção. A recomendada/escolhida (`principal()`) é a que vai para `valor_total`, `servico` e período.
- Passo 4 do editor tem **Valor final combinado**: substitui o total da tabela e mostra a diferença como "Condição especial combinada".
- Os 13 orçamentos feitos antes do painel (jul–nov/2026) foram importados com `payload.importada`; o editor mostra um aviso e mantém o valor passado ao cliente.
