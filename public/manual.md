# Manual do painel Pet Lar

Versão 2.6 · atualizado em 12/11/2026

O painel Pet Lar é onde ficam os clientes, os pets, os orçamentos, a agenda e o dinheiro do negócio. Ele funciona no navegador do celular ou do computador, sem instalar nada.

**Endereço:** https://propostas.petlar.workers.dev

## Sumário

- [Primeiro acesso](#primeiro-acesso)
- [Níveis de acesso](#niveis-de-acesso)
- [As abas](#as-abas)
- [Como fazer uma proposta](#como-fazer-uma-proposta)
- [Proposta com duas opções](#proposta-com-duas-opcoes)
- [Clientes com mais de um pet](#clientes-com-mais-de-um-pet)
- [Histórico por cliente](#historico-por-cliente)
- [Orçamentos importados](#orcamentos-importados)
- [Completar cadastros](#completar-cadastros)
- [Depois que o cliente responde](#depois-que-o-cliente-responde)
- [Cobrar resposta](#cobrar-resposta)
- [Filtros](#filtros)
- [Diário do pet](#diario-do-pet)
- [Área do tutor](#area-do-tutor)
- [Regras de preço](#regras-de-preco)
- [Dicas e dúvidas](#dicas-e-duvidas)

## Primeiro acesso

1. Alguém com nível **Administrador** libera o seu e-mail em **Configurações → Quem tem acesso**.
2. Abra o site, digite o e-mail, crie uma senha (mínimo de 6 caracteres) e toque em **Primeiro acesso**.
3. Chega um e-mail de confirmação. Toque no link.
4. Volte ao site e toque em **Entrar** com o e-mail e a senha.

Se esquecer a senha, digite o e-mail e toque em **Esqueci a senha**. Chega um link para criar uma nova.

**Jeito mais rápido (sem e-mail):** o Administrador cria uma **senha provisória** para a pessoa (veja abaixo, em Dicas e dúvidas). Ela entra com o e-mail e essa senha, e o painel pede na hora para ela criar a senha dela.

**No iPhone:** abra o site no Safari, toque em Compartilhar e depois em **Adicionar à Tela de Início**. O painel vira um ícone, igual a um app.

## Níveis de acesso

| Nível | Quem | O que pode fazer |
|---|---|---|
| **Administrador** | Bruno | Tudo. É o único que dá, muda e tira acessos. |
| **Gestora** | Larissa | Todo o negócio: propostas, valores, financeiro, Pix e configurações. Não mexe em acessos. |
| **Assistente** | Uma ajudante, no futuro | A rotina dos pets: Hoje, Agenda, Pets e Tutores. Pode editar a ficha e a foto dos pets e o contato dos tutores. **Não vê** valores, propostas, financeiro nem o Pix. Na agenda, só aparecem serviços confirmados. |

O banco de dados também aplica essas regras. Mesmo que alguém tente abrir uma tela escondida, os dados não chegam.

Para mudar o nível de alguém: **Configurações → Quem tem acesso**, escolha o nível na caixinha ao lado do nome. Sempre precisa existir pelo menos um Administrador.

## As abas

| Aba | Para que serve |
|---|---|
| **Hoje** | Resumo do dia: quantos serviços tem hoje, quem chega e quem vai embora, os próximos 7 dias, o botão **📓 Diário de hoje** de cada serviço, os orçamentos para cobrar (com Aceitou, Recusou, Cobrar e Adiar) e quanto há a receber. |
| **Propostas** | Todos os orçamentos. Filtre por situação (rascunho, enviada, aceita, recusada) ou veja **Por cliente**. Busque pelo nome do tutor ou pelo número (PL-2026-001). Cada orçamento em aberto tem os botões **Aceitou**, **Recusou**, **Cobrar** e **Adiar**, sem precisar abrir. |
| **Cobrar** | Quem recebeu orçamento e ainda não respondeu: quem cobrar agora, quem recebeu há pouco, quem ficou para depois e quem está sem resposta há muito tempo. O número no menu mostra quantos estão para cobrar. |
| **Pets** | **Com a Lari agora** (serviços em andamento), **Próximos** (confirmados nos próximos 60 dias) e **Todos**. Toque no pet para abrir a ficha. |
| **Tutores** | Os clientes. A ficha tem contato, endereço, observações de acesso (chave, portaria), os pets dele e o histórico de orçamentos. |
| **Agenda** | Calendário do mês. Mostra cada serviço confirmado e quantos hóspedes há por dia. Avisa quando passa da capacidade da casa. |
| **Financeiro** | Parcelas a receber, as vencidas, o que entrou no mês e a receita por tipo de serviço. O botão **Recebi** registra o pagamento. |
| **Configurações** | Chave Pix, contato que sai no PDF, capacidade de hospedagem, dias para lembrar propostas, acessos e senha. |
| **Como usar** | Este manual. |

No celular, Tutores, Financeiro, Configurações e Como usar ficam no botão **Mais**.

Para quem não é administrador, o menu mostra só o que aquele nível pode usar.

## Como fazer uma proposta

Toque em **+ Nova proposta** (na tela Hoje, em Propostas ou na ficha do tutor).

1. **Cliente.** Comece a digitar o nome. Se o tutor já existe, ele aparece na lista: toque e os pets dele entram sozinhos. Se é novo, continue digitando. Ele é cadastrado ao salvar. Escolha a cidade do atendimento: fora de Balneário Camboriú entra o deslocamento.
2. **Pets.** Nome, espécie, raça, idade, porte e foto. Toque em **+ pet** para incluir outro. Sem foto, a proposta usa uma patinha.
3. **Serviço.** Visitas, pacote mensal, visita estendida (3h), hospedagem ou banho em casa. Preencha as datas. O valor é calculado na hora pela tabela. Para mandar duas alternativas, veja [Proposta com duas opções](#proposta-com-duas-opcoes).
4. **Ajustes.** Desconto especial (%), adicionais (cuidado especial, pet reativo, outro) e **Valor final combinado**. Use este último quando fechar um valor diferente da tabela: a proposta mostra a diferença como "Condição especial combinada".
5. **Recado.** Texto livre que aparece no PDF.

O quadro escuro **Conta (só você vê)** mostra o cálculo completo, inclusive o adicional de feriado, que não aparece para o cliente.

A proposta **salva sozinha** enquanto você digita, a partir do momento em que tem o nome do tutor ou de um pet. O número (PL-2026-001…) é dado no primeiro salvamento.

### Rascunho × enviada

Enquanto você preenche, a proposta é um **Rascunho**: já fica salva no painel e aparece na aba Propostas (com borda tracejada), mas **o cliente ainda não recebeu**.

No fim do formulário tem o passo **5 · Enviar para o cliente**, com o que já está pronto (cliente, WhatsApp, pets, serviço e datas) e dois botões:

- **Enviar para Fulana**: abre as opções de envio abaixo;
- **Terminar depois**: guarda o rascunho e volta para Propostas.

Rascunhos esquecidos aparecem em três lugares: aviso no **Hoje** ("X propostas em rascunho"), faixa no topo de **Propostas** e o botão **Enviar** em cada rascunho da lista.

### Enviar

Toque em **Enviar** (no topo, no passo 5 ou na lista). Dá para:

- **Compartilhar PDF**, que abre o WhatsApp ou o app que você escolher;
- **Compartilhar imagem (card)**, uma versão curta para o WhatsApp;
- **Abrir conversa com a mensagem**, com o texto pronto e o Pix copia e cola do sinal;
- **Copiar mensagem**.

Ao enviar, a proposta passa de Rascunho para **Enviada**.

### Menu ••• da proposta

Marcar como aceita ou recusada, voltar para enviada, cancelar o serviço, duplicar (bom para cliente que repete) e excluir.

## Proposta com duas opções

Serve para mandar, no mesmo PDF, duas alternativas para o cliente escolher. Por exemplo: hospedagem aqui em casa **ou** visitas na casa dele.

1. No passo 3 (Serviço), no quadro **Quer oferecer duas opções?**, toque em um atalho:
   - **Hospedagem ou visitas**: opção 1 vira hospedagem e opção 2 vira visitas, com as mesmas datas;
   - **Avulso ou pacote mensal**: opção 1 visitas avulsas, opção 2 pacote mensal;
   - **Outra combinação**: a opção 2 começa igual à 1 e você muda o que quiser.
2. Mude o que for diferente: serviço, datas, desconto, adicionais ou valor combinado. Use as abas **Opção 1** e **Opção 2** para alternar entre elas. Cliente e recado valem para as duas.
   - **Pets diferentes em cada opção:** com mais de um pet, aparece **Pets nesta opção** logo abaixo das abas. Toque no pet para tirar ou pôr de volta naquela opção. Ex.: opção 1 com os dois gatos (visitas), opção 2 só com um (hospedagem). O preço, o PDF ("Para Mimi") e o aceite usam só os pets daquela opção. Cada opção precisa de pelo menos 1 pet.
3. A opção com ⭐ é a **recomendada**: fica em destaque no PDF e no card. Para trocar, abra a outra opção e toque em **Recomendar a opção**.
4. No PDF, no card e na mensagem aparecem as duas, cada uma com o seu valor. O Pix do sinal só vai depois que o cliente escolher.
5. Quando o cliente responder: menu ••• → **Aceitou a opção 1** ou **Aceitou a opção 2**. O sinal e o saldo saem com o valor da opção escolhida, e ela passa a aparecer como "Escolhida". Se precisar mandar de novo, o PDF já sai com o QR do Pix.

Na lista de propostas, na agenda e nos totais conta a opção recomendada (ou a escolhida, depois da resposta). Para voltar a ter uma opção só, abra a que quer tirar e toque em **remover opção**.

## Clientes com mais de um pet

- Cada pet tem a sua ficha, ligada ao tutor. Um tutor pode ter quantos pets precisar.
- Ao escolher o tutor numa proposta nova, os pets ativos dele entram sozinhos. Tire quem não vai participar.
- Para cadastrar um pet sem fazer proposta: ficha do tutor → **+ Adicionar pet**.
- Para mudar um pet de tutor: ficha do pet → **trocar tutor**.
- Pet que não é mais cliente: desmarque **ativo** na ficha. Ele sai das sugestões, mas o histórico continua.

## Histórico por cliente

Há dois caminhos:

1. **Ficha do tutor → Histórico de orçamentos.** Lista todos os orçamentos dele, do mais novo para o mais antigo: serviço, pets, data em que foi feito, período, valor (com o valor de tabela riscado quando houve desconto) e situação. No topo ficam os totais: orçamentos, aceitos, taxa de aceite e quanto já contratou.
2. **Propostas → Por cliente.** Uma linha por cliente, com quantos orçamentos recebeu, quantos aceitou e quanto já contratou. Toque para abrir a ficha.

## Orçamentos importados

Os orçamentos feitos antes do painel (cards e PDFs de julho a novembro de 2026) foram trazidos para cá com os dados que tínhamos: tutor, pets, raça, idade, porte, serviço e o valor que foi passado ao cliente.

Ao abrir um deles, aparece um aviso **Orçamento importado do histórico**. Nesses orçamentos:

- o valor passado ao cliente está em **Valor final combinado**, então o número não muda mesmo que a tabela tenha mudado;
- onde faltou informação, o campo ficou vazio: datas, WhatsApp, foto, nome de alguns pets e tutores;
- todos entraram como **Enviada**. Marque como aceita ou recusada conforme o que aconteceu (dá para marcar vários de uma vez em Propostas → **Selecionar**);
- os do Hulk e Máximus e do Lupi já estão com **duas opções**.

**Para completar:** use a tela **Completar cadastros** (abaixo). Também dá para abrir o orçamento ou a ficha do pet e preencher por lá.

## Quem fez cada proposta

Cada proposta guarda quem criou (o login). Na lista de **Propostas** aparece "por Larissa", "por Bruno"… e nos **Filtros** tem **Quem fez**. Administrador e Gestora veem as propostas de todo mundo.

> Se uma proposta "sumiu": confira se não há um filtro ligado (a barra de filtros mostra o que está ativo) ou se a aba de status não está em Enviadas/Aceitas. Rascunhos aparecem em **Todas** e **Rascunhos**. Propostas feitas no gerador antigo (link do Claude) **não** entram no painel.

## Enquadrar a foto do pet

Sempre que você escolhe uma foto de pet (na proposta, na ficha do pet ou em Completar cadastros), abre a tela **Enquadrar a foto**:

| Gesto | O que faz |
|---|---|
| Arrastar com um dedo | Reposiciona a foto |
| Pinça com dois dedos, ou a barra / botões − e + | Zoom (até 4×) |
| Botão de girar | Gira 90° (foto deitada) |
| **Usar esta foto** | Salva o recorte quadrado (até 1080 px) |

O círculo mostra como a foto aparece nas listas. Para ajustar uma foto que já está salva, toque em **Enquadrar** ao lado de "Trocar foto". O cliente tem o mesmo recurso na área do tutor.

## Aniversários

Na ficha do pet (painel) há o campo **Aniversário**: dia, mês e, se souber, o ano (aí a idade é calculada). O cliente também pode preencher pela área do tutor. Na tela **Hoje**, os aniversários dos próximos 7 dias aparecem numa lista; no dia, tem o botão **Parabéns**, que abre o WhatsApp do cliente com uma mensagem pronta.

## Completar cadastros

Junta numa tela só tudo o que está faltando, principalmente nos orçamentos importados. Abra pelo aviso **Completar cadastros** no Hoje ou em **Mais → Completar cadastros** (só Administrador e Gestora).

| Parte | O que fazer ali mesmo |
|---|---|
| Propostas sem cliente | Toque para abrir e escolher o cliente |
| Clientes sem WhatsApp | Digite o número e toque em **Salvar** |
| Pets sem nome / sem raça | Digite e toque em **Salvar** |
| Pets sem foto | Toque em **Pôr foto** e escolha a foto do celular |
| Orçamentos sem data | Toque para abrir e pôr as datas |

Cada item some da lista assim que é salvo. O aviso no Hoje mostra quantas informações ainda faltam.


## Depois que o cliente responde

Dá para fazer tudo direto da lista, sem abrir o orçamento: em **Propostas**, **Cobrar** ou **Hoje**, use os botões embaixo de cada um.

- **✅ Aceitou:** pede uma confirmação e lança o sinal e o saldo no Financeiro. Se o orçamento tiver duas opções, pergunta qual foi aceita.
- **✖ Recusou:** muda na hora. Se tocou errado, toque em **Desfazer** no aviso.
- **Vários de uma vez:** em Propostas, toque em **Selecionar**, marque os orçamentos e escolha **Aceitaram**, **Recusaram** ou **Sem resposta**.

Dentro do orçamento também funciona:

- **Aceitou:** menu ••• → **Cliente aceitou**. O sistema lança duas parcelas no Financeiro: o sinal de 50% (vence hoje) e o saldo de 50% (vence no último dia do serviço). O serviço aparece na Agenda e em Hoje.
- **Recebeu o dinheiro:** Financeiro → **Recebi** → escolha Pix, dinheiro ou cartão. Também dá para fazer isso dentro da proposta, no quadro Pagamentos.
- **Recusou:** menu ••• → **Cliente recusou**. Entra na taxa de aceite.
- **Desistiu depois de aceitar:** menu ••• → **Cancelar serviço**.

## Cobrar resposta

A aba **Cobrar** junta os orçamentos enviados que ainda não tiveram resposta.

| Grupo | O que entra |
|---|---|
| **Cobrar agora** | Enviados (ou cobrados pela última vez) há 2 dias ou mais. O prazo muda em Configurações → "Lembrar proposta sem resposta após (dias)" |
| **Enviadas há pouco** | Ainda dentro do prazo, é só esperar |
| **Adiadas** | Você pediu para lembrar numa data. Voltam para "Cobrar agora" nesse dia |
| **Sem resposta há mais de 15 dias** (Configurações → "Considerar sem resposta depois de") | Dá para marcar todos de uma vez como sem resposta (expirados). Eles saem da lista |

**Como cobrar:** toque em **💬 Cobrar**. Abre o WhatsApp do tutor com a mensagem pronta, e a mensagem muda conforme a vez:

1. 1ª vez: pergunta com carinho se deu para ver e se ficou alguma dúvida.
2. 2ª vez: avisa que as datas estão procuradas e oferece segurar com o sinal.
3. 3ª vez em diante: avisa que vai liberar as datas na agenda.

Revise a mensagem no WhatsApp e mande. A cobrança fica registrada (quantas vezes e quando) e o orçamento volta para "Cobrar agora" depois do prazo.

**⏰ Adiar:** quando o cliente pediu um tempo ("vou ver com meu marido", "te falo na sexta"). Escolha amanhã, 3 dias, 1 semana, 15 dias ou uma data.

Se o tutor não tem WhatsApp cadastrado, o WhatsApp abre para você escolher o contato.

## Filtros

As abas Propostas, Pets, Tutores, Agenda e Financeiro têm o botão **⚙️ Filtros**.

1. Toque em **Filtros**, marque o que quer ver e toque em **Aplicar**.
2. Cada filtro ativo vira uma etiqueta embaixo do botão. Toque na etiqueta para tirar só aquele filtro, ou em **Limpar tudo**.
3. O filtro fica guardado no aparelho: ao voltar para a aba, ele continua lá. Períodos como "Este mês" se atualizam sozinhos.

| Aba | Dá para filtrar por |
|---|---|
| Propostas | Data em que foi feita · data do serviço · tipo de serviço · cidade · valor (mínimo e máximo). Junta com a situação (Enviadas, Aceitas…) e a busca. Os números do topo seguem o filtro. |
| Pets | Espécie · porte · ativos ou inativos · com ou sem foto · cuidados (remédio, limitação, reativo) · nome do tutor |
| Tutores | Cidade · bairro · situação (já fechou, tem orçamento sem resposta, nunca fechou) · data do último orçamento · com ou sem WhatsApp |
| Agenda | Tipo de serviço · espécie · nome do tutor ou do pet. O aviso de capacidade continua contando todos os hóspedes. |
| Financeiro | Tipo de serviço · parcelas vencidas ou a vencer · forma de recebimento · vencimento · cliente |

Na visão **Por cliente** (em Propostas) os filtros não se aplicam.

## Diário do pet

Durante uma estadia ou visita, registre com um toque o que aconteceu. No fim do dia, mande o resumo para o tutor.

**Onde abrir:**
- Na tela **Hoje**, botão **📓 Diário de hoje** em cada serviço em andamento.
- No orçamento aceito: menu ••• → **Diário do serviço**.

**Como usar:**

1. Toque no que aconteceu: 🍽️ Comeu · 💧 Bebeu água · 🦮 Passeou · 💛 Xixi · 💩 Cocô · 💊 Remédio · 😴 Dormiu · 🎾 Brincou. O registro entra na hora, com o horário.
2. **Fotos no WhatsApp:** por enquanto, fotos e vídeos vão direto pelo WhatsApp (decisão de 12/11/2026, para não pagar armazenamento maior agora). O botão abre a conversa com o tutor e marca no diário "Fotos e vídeos enviados no seu WhatsApp", para o tutor ver na área dele. A foto de perfil de cada pet continua no painel.
   - *Quando voltarmos a guardar no painel* (é só ligar uma chave no código): o botão vira **Foto ou vídeo**. Vídeos de até **90 segundos**. O vídeo vai **original, na qualidade do iPhone**, sempre que tiver até 48 MB (o limite do plano grátis). Se passar disso, o painel regrava em **Full HD** com a maior qualidade que cabe (nunca abaixo de Full HD). Deixe a tela ligada enquanto aparece "Preparando o vídeo em Full HD…".
   - O tutor vê o vídeo no diário e na aba Fotos da área do tutor.
3. **📝 Recado:** escreve qualquer coisa ("comeu tudo e dormiu no sofá").
4. Com mais de um pet, os botões **Registrar para** escolhem de quem é o registro. Já vêm todos marcados.
5. Errou? Toque em **Desfazer** no aviso. Para mudar a hora ou o texto, ou apagar, toque no registro na linha do tempo.
6. Use as setas para ver os outros dias do serviço. Registro feito em outro dia entra ao meio-dia, e dá para ajustar a hora.

**📤 Mandar resumo do dia:** monta o texto com tudo o que foi registrado ("08:10 🍽️ Comeu…"). Toque em **Mandar no WhatsApp** e depois em **Compartilhar as fotos** para mandar as fotos do dia na mesma conversa.

A ficha de cada pet mostra o diário de todos os serviços, dia por dia. Mais para frente, este diário é o que o tutor vai ver na área dele.

## Espaço para fotos e vídeos

> Hoje as fotos e vídeos do diário vão pelo WhatsApp. O painel guarda só a foto de perfil dos pets. O que está abaixo vale para quando o envio pelo painel for ligado de novo.

Fotos e vídeos ficam no armazenamento privado do Supabase (plano grátis: **1 GB**). Em **Configurações → Fotos e vídeos guardados** aparece quanto já foi usado.

| Tipo | Tamanho médio | Cabe em 1 GB |
|---|---|---|
| Foto (já diminuída pelo painel) | 0,2 a 0,3 MB | 3.000 a 5.000 fotos |
| Vídeo curto original (até 48 MB) | 10 a 48 MB | 20 a 100 vídeos |
| Vídeo regravado em Full HD (30 s) | cerca de 45 MB | cerca de 22 vídeos |

- Quando passar de 80%, a barra fica terracota e aparece um aviso.
- O botão **Apagar vídeos com mais de 90 dias** libera espaço (as fotos ficam). A área do tutor mostra só os últimos 60 dias.
- Com vídeos em alta qualidade, 1 GB enche rápido. Para guardar os vídeos **originais em 4K** sem limite de tamanho, é preciso mais espaço: Cloudflare R2 (10 GB grátis e depois cerca de R$ 0,08 por GB por mês; precisa cadastrar um cartão) ou o plano Pro do Supabase (US$ 25/mês, 100 GB).

## Área do tutor

Cada cliente pode ter um **link só dele**, sem senha e sem código, para acompanhar os pets pelo celular. Foi pensado para quem não tem intimidade com tecnologia: é só tocar no link que chega pelo WhatsApp.

### Como mandar o link

1. Abra **Tutores** e toque no cliente.
2. Em **Área do tutor**, toque em **Criar link da área do tutor**.
3. Toque em **Mandar no WhatsApp**. A mensagem já vai pronta, com o link.

Na mesma caixa você vê quando o link foi criado, se o cliente já aceitou o aviso de privacidade, o último acesso e quantas vezes ele entrou.

| Botão | Para que serve |
|---|---|
| Mandar no WhatsApp | Abre a conversa com o cliente e a mensagem com o link |
| Copiar link | Para colar em outro lugar |
| Ver como o tutor vê | Abre a área do tutor exatamente como o cliente vê |
| Trocar link | O link antigo para de funcionar e nasce um novo (use se o cliente encaminhou para alguém) |
| Desativar | O link para de funcionar na hora |

### O que o cliente vê

A área do tutor funciona como um aplicativo, com uma barra de 5 abas embaixo:

| Aba | O que tem |
|---|---|
| Primeira vez | Boas-vindas e o aviso sobre os dados (LGPD). Ele toca em **Entendi, quero entrar** |
| **Início** | O pet em destaque (foto grande), se ele está com você agora, **o dia do pet** (comeu, água, passeio, xixi, cocô e remédio, com a hora em que você marcou), a foto ou vídeo mais recente e os próximos cuidados. O aviso de orçamento para responder fica no topo; **Complete o cadastro** e **Falta o sinal (Pix)** ficam no fim da página, para não atrapalhar. Com mais de um pet, ele troca de pet no topo |
| **Diário** | Os dias com registro (Hoje, Ontem…) e a linha do tempo de cada dia, com recados e fotos |
| **Fotos** | Todas as fotos e vídeos dos últimos 60 dias. Toque para ver em tela cheia, passar para o lado e salvar ou compartilhar |
| **Pets** | Cada pet com uma ficha em forma de conversa. **Nada é obrigatório**: só 3 itens aparecem como *importante* (porte, o que come e remédios) e o resto fica em **Se quiser contar mais**, recolhido. Tem respostas de um toque ("Não toma remédio", "SRD", "Nenhum cuidado especial") e o **aniversário** (dia e mês; o ano só se souber). O cliente também troca a foto |
| **Mais** | Orçamentos para responder (com as duas opções, se houver), cuidados confirmados, pagamentos (pago ou a vencer, com Pix), cuidados anteriores com estrelas, **Seus dados** (WhatsApp e endereço como importantes; bairro, cidade e e-mail se quiser), falar com você, como deixar na tela do celular e privacidade |

Quando ele confirma um orçamento, a proposta vira **Aceita** e abre o Pix do sinal (QR Code e copia e cola).

### O que muda no painel

- Quando o cliente aceita pelo link, a proposta fica **Aceita**, com sinal e saldo lançados no Financeiro, igual a quando você marca **Aceitou**.
- Quando ele atualiza a ficha ou a foto, a ficha do pet mostra o aviso **O tutor atualizou a ficha pela área do tutor**.
- As estrelas aparecem no **Histórico de orçamentos** do cliente.
- Ele só vê os próprios pets. Valores de outros clientes, a agenda e o financeiro nunca aparecem.

### Dicas

- Mande o link logo depois que o cliente aceitar o primeiro orçamento, ou junto com o orçamento.
- O link não vence sozinho. Se o cliente perder, mande de novo (o mesmo). Se ele encaminhar para alguém, use **Trocar link**.
- Para o cliente: no iPhone, Compartilhar → **Adicionar à Tela de Início**. No Android, três pontinhos → **Adicionar à tela inicial**.

## Regras de preço

O painel segue a **tabela v2.3**. A nota completa está no Obsidian ("Pet Lar - Servicos e Precos").

| Item | Regra |
|---|---|
| Visita | R$ 70. A 2ª visita do mesmo dia tem 40% de desconto |
| Pacote viagem (visitas) | 5–9 dias −5% · 10–24 dias −10% · 25+ dias −15% |
| Pacote mensal | Mês = 4,3 semanas. 1–2x/semana −5% · 3–4x −10% · 5x ou mais −15% |
| Visita estendida (3h) | R$ 150 |
| Hospedagem | P, M e gato R$ 100 · G e GG R$ 120. Conta o dia de entrada e o de saída. 7–20 diárias −10% · 21+ −15% |
| Pet adicional | Visita: +R$ 42 se passeia, +R$ 15 se não passeia. Hospedagem: 60% da diária |
| Banho em casa | P R$ 90 · M R$ 120 · G R$ 160 · GG R$ 200 · gato R$ 100. Quinzenal −10% · semanal −15% · 2º pet −10% |
| Deslocamento | Itajaí e Camboriú R$ 30 por deslocamento. Outra cidade: valor digitado |
| Feriados | +20% (24/12, 25/12, 31/12, 01/01 e Carnaval). Não aparece para o cliente |
| Pagamento | 50% para confirmar, 50% no fim |
| Arredondamento | Múltiplo de R$ 5 |

## Dicas e dúvidas

**A proposta não salva.** Ela só salva quando tem o nome do tutor ou de um pet. Confira também a internet: o aviso "Erro ao salvar" some na próxima alteração.

**O QR Code do Pix não aparece no PDF.** Cadastre a chave em Configurações → Chave Pix e use o QR de teste de R$ 1 para conferir se cai na conta certa.

**Quero mandar a mesma proposta com outra data.** Menu ••• → Duplicar.

**Apareceu "Mais hóspedes que a capacidade" na Agenda.** Ajuste a capacidade em Configurações ou reveja as datas.

**Alguém novo vai ajudar.** O Administrador libera o e-mail com o nível **Assistente**.

**Alguém esqueceu a senha.** A própria pessoa pode tocar em **Esqueci a senha** no login. O Administrador tem dois caminhos em Configurações → Quem tem acesso, ao lado do nome:

- **senha provisória**: o painel sugere uma senha fácil de ditar (pode trocar), você toca em **Definir senha** e manda para a pessoa (botões de copiar e de WhatsApp). Ela entra com essa senha e o painel obriga a criar a dela antes de continuar. Se a pessoa ainda não tinha conta, a conta é criada na hora, sem e-mail de confirmação.
- **link de senha**: Chega um e-mail com um link que vale por 1 hora. O e-mail gratuito tem limite de alguns envios por hora; se aparecer aviso de "muitos e-mails", espere uns minutos.

## Histórico de versões

| Versão | Data | O que mudou |
|---|---|---|
| 2.6 | 12/11/2026 | Quadro "Quer oferecer duas opções?" com atalhos (hospedagem ou visitas; avulso ou pacote). Idade com a palavra "anos" no PDF, no card e na área do tutor |
| 2.5 | 12/11/2026 | Enquadrar a foto do pet (arrastar, zoom com pinça, girar) no painel e na área do tutor |
| 2.4 | 12/11/2026 | Passo 5 da proposta (rascunho explicado, o que falta, Enviar / Terminar depois), rascunhos destacados na lista, aviso no Hoje e botão Enviar nos rascunhos. Fotos e vídeos do diário pelo WhatsApp por enquanto |
| 2.3 | 12/11/2026 | Ficha do pet na área do tutor sem obrigação (só 3 importantes, respostas de um toque, extras recolhidos) e aniversário do pet. Aniversários no Hoje. Quem fez cada proposta (lista e filtro). Vídeo original em qualidade máxima até 48 MB; acima, Full HD |
| 2.2 | 11/11/2026 | Vídeo no diário (diminuído no celular antes de enviar) e medidor de espaço. Área do tutor: Pix no fim da página, cliente completa os próprios dados e os do pet. Pix do sinal da proposta numa faixa própria, com QR maior e a chave |
| 2.1 | 11/11/2026 | Área do tutor refeita como aplicativo com abas (Início, Diário, Fotos, Pets, Mais). Senha provisória pelo Administrador. Pets diferentes em cada opção da proposta. Tela Completar cadastros |
| 2.0 | 10/11/2026 | Área do tutor (link pessoal no WhatsApp: diário, fotos, orçamento com Pix, ficha, avaliação). Painel com a identidade visual da Pet Lar (ícones de traço, paleta oficial, logo em imagem). O nome do cliente só é cadastrado quando você sai do campo |
| 1.5 | 10/11/2026 | Diário do pet: registros com um toque, fotos, recados, linha do tempo e resumo do dia para o WhatsApp |
| 1.4 | 10/11/2026 | Filtros em Propostas, Pets, Tutores, Agenda e Financeiro |
| 1.3 | 10/11/2026 | Aba Cobrar resposta, botões Aceitou/Recusou/Cobrar/Adiar direto da lista, mudança em lote e link de nova senha |
| 1.2 | 10/11/2026 | Proposta com duas opções (recomendada, escolhida e aceite por opção) |
| 1.1 | 10/11/2026 | Níveis de acesso (administrador, gestora, assistente), valor final combinado, histórico por cliente, orçamentos antigos importados, endereço novo e este manual dentro do painel |
| 1.0 | 10/11/2026 | Painel com Hoje, Propostas, Pets, Tutores, Agenda, Financeiro e Configurações, ligado ao banco de dados |
