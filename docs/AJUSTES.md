# Pet Lar · Backlog de ajustes

Lista viva do que melhorar no painel depois do MVP. Cada item tem a situação ao lado do título.
Cópia no Obsidian: "Pet Lar - Backlog de Ajustes" (a versão mais recente é a de número mais alto). **Ao pedir, mudar ou entregar um ajuste, atualizar os dois.**

Status: 🟡 a fazer · 🔵 em andamento · ✅ feito · ⏸️ pausado
Origem: **Bruno** (pedido) ou **Claude** (observado durante o desenvolvimento, precisa do seu ok)

## Pedidos do Bruno

### A-01 · Mudar a situação da proposta direto da lista ✅ (v1.3)
- **Origem:** Bruno, 10/11/2026
- **Problema:** em Propostas, para marcar aceita, recusada etc. é preciso abrir a proposta e ir no menu •••. Com muitos orçamentos, fica lento.
- **Ideia de solução:**
  - Botões rápidos em cada linha da lista: **Aceitou**, **Recusou**, **Cobrar** (WhatsApp). Ou um seletor de situação na própria linha.
  - No celular, deslizar a linha para o lado mostra as ações.
  - Seleção de vários de uma vez para mudar a situação em lote (útil para os importados).
  - Mudança otimista, com "Desfazer" no aviso.
- **Atenção:** "Aceitou" lança sinal e saldo no Financeiro. A ação rápida precisa avisar isso.

### A-02 · Filtros em todas as abas ✅ (v1.4)
- **Origem:** Bruno, 10/11/2026
- **Problema:** nenhuma aba filtra por data, tipo de serviço etc.
- **Ideia de solução:** uma barra de filtros padrão, reaproveitada em todas as abas, que lembra a última escolha.

| Aba | Filtros |
|---|---|
| Propostas | Período em que foi feita · período do serviço · tipo de serviço · situação · cidade · faixa de valor · cliente |
| Pets | Espécie · porte · tutor · ativo/inativo · com ou sem foto · com medicação/limitação |
| Tutores | Cidade/bairro · com proposta aceita · sem resposta · último contato |
| Agenda | Tipo de serviço · só hospedagens · só visitas |
| Financeiro | Período · forma de pagamento · pago/em aberto/vencido · tipo de serviço |

- Atalhos de período: hoje, esta semana, este mês, mês passado, personalizado.
- Filtro aplicado aparece como etiqueta removível ("Hospedagem ✕").

### A-03 · Aba "Cobrar resposta" ✅ (v1.3)
- **Origem:** Bruno, 10/11/2026
- **Problema:** falta um lugar só com quem recebeu orçamento e ainda não respondeu. Hoje isso aparece só como "Propostas sem resposta" no fim da tela Hoje.
- **Ideia de solução:**
  - Aba própria (ou atalho fixo no menu) com as propostas Enviadas, da mais antiga para a mais nova.
  - Cada linha mostra: cliente, pets, serviço, valor, **há quantos dias foi enviada** e **quantas vezes já foi cobrada**.
  - Botões: **Cobrar no WhatsApp** (mensagem pronta, tom muda na 1ª, 2ª e 3ª cobrança) · **Aceitou** · **Recusou** · **Adiar** (lembrar daqui a X dias).
  - Registrar cada cobrança: data, quantas vezes e próximo lembrete. No banco, colunas `cobrada_em`, `cobrancas` e `lembrar_em` em `propostas`, ou uma tabela de contatos.
  - Contador no menu ("Cobrar 4") e na tela Hoje.
  - Regra para expirar sozinho: depois de N dias sem resposta, vira "Expirada" (N em Configurações).
- **Depende de:** A-01 (mesmas ações rápidas).

### A-04 · Administrador trocar a senha de outra pessoa 🔵 (parte rápida feita na v1.3)
- **Origem:** Bruno, 10/11/2026
- **Problema:** em Configurações, o administrador não consegue mudar a senha de quem tem acesso. Se a Larissa esquecer, ela precisa usar "Esqueci a senha" sozinha.
- **Ideia de solução:**
  1. **Rápido:** botão "Mandar link de nova senha" ao lado de cada pessoa em Quem tem acesso. Usa o mesmo e-mail do "Esqueci a senha".
  - ✅ Feito na v1.3: botão "🔑 link de senha" em Configurações → Quem tem acesso.
  2. **Completo (falta):** "Definir senha provisória". O administrador digita uma senha e a pessoa troca no primeiro acesso. Precisa de uma função no servidor (Edge Function do Supabase com chave de serviço), porque o navegador não pode mudar a senha de outra pessoa.

## Observados durante o desenvolvimento (precisam do seu ok)

### C-01 · Proposta com duas opções ✅ (v1.2, 10/11/2026)
- **Origem:** Claude, aprovado pelo Bruno. Três dos orçamentos antigos (Karina, Hulk e Máximus, Lupi) tinham 2 opções no mesmo card.
- **Entregue:** "+ Adicionar opção 2" no passo 3 do editor. Cada opção tem serviço, datas, desconto, adicionais e valor combinado próprios; cliente, pets e recado são comuns. Uma fica ⭐ recomendada (destaque no PDF e no card; é a que conta na lista, agenda e totais). PDF, card e mensagem mostram as duas; o Pix do sinal só aparece depois da escolha. Menu ••• → "Aceitou a opção 1/2" lança sinal e saldo da opção escolhida.
- Hulk e Máximus (PL-2026-011) e Lupi (PL-2026-013) foram convertidos para 2 opções. Karina (PL-2026-009) ficou com a opção 2 no recado, porque a opção 2 era só para 1 dos 2 gatos.
- **Limite conhecido:** as duas opções usam os mesmos pets. Ver C-05.

### C-02 · Completar os orçamentos importados 🟡
- **Origem:** Claude. 12 entraram como Enviada. Faltam fotos, datas, WhatsApp, alguns nomes de pets e 4 tutores.
- **Ideia:** depois do A-01, marcar a situação em lote. As fotos podem ser enviadas para o Claude colocar.

### C-03 · Proteção de senha vazada no login ⏸️ (decidido: não ligar agora)
- **Origem:** Claude, aviso do Supabase.
- **Onde fica:** Supabase → projeto pet-lar → Authentication → Sign In / Providers → Email → "Prevent use of leaked passwords".
- **Bloqueio:** só existe no plano Pro do Supabase (US$ 25/mês). No plano grátis não dá para ligar.
- **Alternativa grátis (mesma tela):** "Minimum password length" = 8 e "Password requirements" = letras e números.
- **Decisão (Bruno, 10/11/2026):** não precisa agora.

### C-04 · Assistente e valores pela API ⏸️ (sem uso hoje)
- **Origem:** Claude. A assistente não vê valores nas telas, mas, tecnicamente, consegue ler o valor das propostas aceitas pela API. Isso só importa se um dia entrar alguém de fora da família.
- **Ideia:** uma view sem colunas de valor para a assistente.
- **Decisão (Bruno, 10/11/2026):** hoje só Bruno e Larissa usam o painel, então não há login de assistente. O nível continua pronto no sistema para quando precisar.

### C-05 · Pets diferentes em cada opção 🟡
- **Origem:** Claude. Caso da Karina: opção 1 com os 2 gatos (visitas), opção 2 só com 1 gato (hospedagem).
- **Ideia:** na opção 2, marcar quais pets participam.

## Novas funcionalidades (futuro)

### F-01 · Área do tutor 🟡
- **Origem:** Bruno, 10/11/2026
- **O que é:** telas para o tutor entrar pelo celular e acompanhar o pet: se já comeu, se dormiu, passeios, fotos e vídeos das atividades, recados da Lari.
- **Acesso (decidido pelo Bruno, 10/11/2026): link pessoal.** Muitos clientes têm pouca familiaridade com tecnologia, então nada de senha nem código por SMS.
  - Na ficha do tutor, a Lari toca em "Mandar acesso" e sai uma mensagem de WhatsApp com o link dele.
  - O link abre direto a área do tutor e pode ser salvo na tela de início do celular.
  - Cada link vale só para aquele tutor, pode ser cancelado e trocado a qualquer momento, e pode ter validade (ex.: até o fim da estadia).
  - Plano B, se um dia precisar: tela que pede só o telefone. Sem código de confirmação, porém, qualquer pessoa que souber o número entraria, então o link continua mais seguro e mais simples.
- **Depende de F-02** (✅ pronto na v1.5). O diário já guarda o que o tutor vai ver.
- **O que mais pode entrar:**
  - O tutor completa a ficha do pet: alimentação, remédios, veterinário, acesso à casa. Isso substitui a anamnese longa.
  - Ver e aceitar o orçamento, com o Pix do sinal.
  - Histórico de serviços e fotos de estadias anteriores.
  - Avaliação no fim do serviço.
  - Aviso no celular quando entra foto nova (app instalado na tela de início).
- **Cuidados:**
  - Cada tutor vê só os próprios pets (regra no banco).
  - As fotos ficam privadas, com links temporários.
  - Pedir o consentimento do tutor (LGPD), porque são fotos da casa dele.
  - Espaço para fotos: o plano grátis do Supabase tem 1 GB, o que dá cerca de 5 mil fotos comprimidas.

### F-02 · Diário do pet (lado da Lari) ✅ (v1.5)
- **Origem:** Claude, como base do F-01.
- **O que é:** durante uma estadia ou visita, a Lari registra com botões rápidos: comeu, bebeu água, passeou, fez xixi/cocô, tomou remédio, dormiu, brincou. Cada registro aceita foto e observação, e tudo fica com o horário.
- **Já útil sem o F-01:** gera o relatório do dia pronto para mandar no WhatsApp, e fica salvo no histórico do pet.
- **Entregue (v1.5):**
  - Tela Diário (`#/diario/<serviço>`): 10 botões, com escolha de pets quando há mais de um.
  - Foto com legenda, guardada em `pets/diario/…`, privada.
  - Recado, Desfazer, e editar a hora ou apagar um registro.
  - Navegação pelos dias do serviço.
  - Resumo do dia para o WhatsApp e compartilhamento das fotos.
  - Diário na ficha do pet.
  - Acesso pela tela Hoje, pelo menu da proposta aceita e pela tela Serviço (assistente).
  - Tabela `diario` com regras de acesso no banco.

## Histórico
| Data | O quê |
|---|---|
| 10/11/2026 | Entrou A-04 (trocar senha de usuários). F-01 com acesso por link pessoal (sem SMS). C-03 e C-04 decididos: não fazer agora |
| 10/11/2026 | C-01 entregue (v1.2). C-03 pausado (só no plano Pro). Entraram C-05, F-01 (área do tutor) e F-02 (diário do pet) |
| 10/11/2026 | Criado com A-01, A-02, A-03 (Bruno) e C-01 a C-04 (observados) |
