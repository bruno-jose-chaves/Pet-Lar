# Pet Lar · Gerador de Propostas

Site de uma página onde a Larissa monta a proposta do cliente pelo celular e baixa o **PDF pronto** (A4, 1 página) para mandar no WhatsApp, já na identidade visual oficial da Pet Lar.

- Sem servidor e sem banco de dados: é um HTML estático. O cálculo, o rascunho (salvo no próprio celular) e o PDF acontecem no navegador.
- Pensado para iPhone: pode ser adicionado à Tela de Início e abre como um app.

---

## Estrutura

```
public/                  ← pasta publicada pela Cloudflare
  index.html             ← o app inteiro (HTML + CSS + JS; logo embutido)
  manifest.webmanifest   ← nome e ícones para "Adicionar à Tela de Início"
  _headers               ← cabeçalhos da Cloudflare (noindex, cache, segurança)
  robots.txt             ← bloqueia buscadores (ferramenta interna)
  assets/                ← ícones do iPhone, favicon e logo oficial em PNG
tests/
  test_petlar.py         ← confere os valores da tabela de preços
  test_iphone.py         ← testa todos os botões simulando o iPhone 16 Pro Max
  foto_teste.jpg
```

---

## Publicar na Cloudflare Pages (uma vez só)

1. Painel da Cloudflare → **Workers & Pages** → **Create** → aba **Pages** → **Connect to Git**.
2. Escolha este repositório (`Pet-Lar`) e a branch **main**.
3. Configuração de build:

   | Campo | Valor |
   |---|---|
   | Framework preset | **None** |
   | Build command | *(deixar vazio)* |
   | Build output directory | **`public`** |

4. **Save and Deploy**. O site fica em `https://<nome-do-projeto>.pages.dev`.
5. (Opcional) **Custom domains** → por exemplo `propostas.petlar.com.br`.

> Um projeto do Pages criado por **upload direto** (arrastar arquivos) não pode ser ligado ao Git depois. Nesse caso, crie um projeto novo pelo passo 1. Se quiser, apague o antigo depois.

### Atualizações
Todo `git push` na branch `main` publica sozinho em cerca de 1 minuto. Outras branches geram um link de prévia, sem mexer no site oficial.

### Proteger o acesso (opcional, recomendado)
A tabela de preços está dentro do código. Para só a Larissa (e você) abrir:
**Zero Trust → Access → Applications → Add → Self-hosted**, com o domínio do site e a política "Emails: e-mail da Larissa, e-mail do Bruno". O login é por código enviado ao e-mail. É grátis até 50 usuários.

---

## Instalar no iPhone da Larissa
1. Abrir o link no **Safari**.
2. Tocar em **Compartilhar** → **Adicionar à Tela de Início**.
3. Pronto: o ícone da Pet Lar abre o gerador em tela cheia.

**Enviar a proposta:** "Baixar PDF" abre a tela de compartilhar do iPhone com o PDF → **WhatsApp** → contato.

---

## Onde mudar as coisas (em `public/index.html`)

| O que | Onde |
|---|---|
| Preços e descontos | bloco `CONFIG — Tabela v2.2` (constante `T`) no início do `<script>` |
| WhatsApp e Instagram do rodapé | constante `CONTATO` |
| Logo | constante `LOGO` (imagem em base64). O PNG original está em `public/assets/logo-petlar.png` |
| Textos do que está incluso | funções `incVisita`, `incHosp`, `incBanho` |
| Cores e fontes | variáveis `:root` no `<style>` |

Regras de preço oficiais: nota **Pet Lar - Servicos e Precos** (Obsidian › 30-Projetos/pet-sitter). Os pontos principais:
- Visita R$ 70. A 2ª visita no mesmo dia tem −40%. Pacote viagem: −5% / −10% / −15% para 5 / 10 / 25 dias ou mais.
- Hospedagem: R$ 100 (P/M e gato) ou R$ 120 (G). **Conta do dia de entrada ao de saída.** Estadia de 7 a 20 diárias tem −10%; de 21 ou mais, −15%.
- Banho: P 90 · M 120 · G 160 · GG 200 · gato 100. Plano quinzenal −10%, semanal −15%.
- Pet adicional: 60% (se passeia) ou R$ 15 (se não passeia). Deslocamento para Itajaí ou Camboriú: R$ 30 por deslocamento.
- Feriado +20%: é interno e não aparece no PDF. O total é arredondado para múltiplo de R$ 5.

---

## Rodar os testes
```bash
pip install playwright && python -m playwright install chromium webkit
python tests/test_petlar.py          # valores da tabela
python tests/test_iphone.py webkit   # app inteiro no iPhone 16 Pro Max
PETLAR_URL=https://<seu-site>.pages.dev python tests/test_iphone.py webkit   # testar o site publicado
```
