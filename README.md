# Pet Lar · Painel (v1)

Sistema da Pet Lar para a Larissa usar no celular: **propostas** (PDF, imagem, WhatsApp e Pix), **tutores**, **pets**, **agenda** e **financeiro**.

- **Site:** https://propostas.petlar.workers.dev (Cloudflare Worker `propostas`). Até a troca de nome, o endereço é https://pet-lar.brunojosechavescarvalho.workers.dev
- **Banco:** Supabase, projeto `pet-lar` (São Paulo), com login e fotos privadas.
- **Publicação:** todo `git push` na `main` publica sozinho (Workers Builds).

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
| **Configurações** | Chave Pix (QR do sinal no PDF + copia e cola na mensagem), contato, capacidade, dias para follow-up, **quem tem acesso**, trocar senha |

## Acesso
1. O e-mail precisa estar liberado em **Configurações → Quem tem acesso**. Os dois e-mails do Bruno já vêm liberados.
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
  js/ui.js              utilitários (formatação, modal, toast, compartilhar)
  js/pix.js             Pix copia e cola (BR Code do Banco Central) + QR
  js/pages/*.js         uma tela por arquivo, carregada só quando abre
  vendor/               supabase-js, html2canvas, jsPDF, qrcode (sem CDN de terceiros)
  fonts/                Lato e Playfair (só os pesos usados)
tests/
  test_app.py           fluxo completo (66 verificações) com banco simulado · webkit e chromium
  test_precos.py        tabela de preços (21 casos)
  test_perf.py          3G lento + CPU 4x mais lenta
  fake-supabase.js      Supabase em memória para os testes
supabase/
  schema.sql            banco (tabelas, segurança, gatilhos, índices)
wrangler.jsonc          Worker de arquivos estáticos (pasta public/)
```

## Banco (Supabase)
`tutores` → `pets` · `propostas` (+ `proposta_pets`) → `pagamentos` · `settings` · `admins`
- **Segurança (RLS):** só e-mails da tabela `admins` leem e gravam. Fotos ficam em armazenamento **privado**, com links temporários.
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
