# Pet Lar · Backlog de ajustes

Lista viva do que melhorar no painel depois do MVP. Nada aqui está feito ainda.
Cópia no Obsidian: "Pet Lar - Backlog de Ajustes". **Ao pedir, mudar ou entregar um ajuste, atualizar os dois.**

Status: 🟡 a fazer · 🔵 em andamento · ✅ feito · ⏸️ pausado
Origem: **Bruno** (pedido) ou **Claude** (observado durante o desenvolvimento, precisa do seu ok)

## Pedidos do Bruno

### A-01 · Mudar a situação da proposta direto da lista 🟡
- **Origem:** Bruno, 10/11/2026
- **Problema:** em Propostas, para marcar aceita, recusada etc. é preciso abrir a proposta e ir no menu •••. Com muitos orçamentos, fica lento.
- **Ideia de solução:**
  - Botões rápidos em cada linha da lista: **Aceitou**, **Recusou**, **Cobrar** (WhatsApp). Ou um seletor de situação na própria linha.
  - No celular, deslizar a linha para o lado mostra as ações.
  - Seleção de vários de uma vez para mudar a situação em lote (útil para os importados).
  - Mudança otimista, com "Desfazer" no aviso.
- **Atenção:** "Aceitou" lança sinal e saldo no Financeiro. A ação rápida precisa avisar isso.

### A-02 · Filtros em todas as abas 🟡
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

### A-03 · Aba "Cobrar resposta" 🟡
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

## Observados durante o desenvolvimento (precisam do seu ok)

### C-01 · Proposta com duas opções 🟡
- **Origem:** Claude. Três dos orçamentos antigos (Karina, Hulk e Máximus, Lupi) tinham 2 opções no mesmo card, por exemplo hospedagem ou visitas. Hoje a opção 2 ficou só no recado.
- **Ideia:** "Adicionar opção 2" no editor, com o PDF e o card mostrando as duas e uma marcada como recomendada.

### C-02 · Completar os orçamentos importados 🟡
- **Origem:** Claude. 12 entraram como Enviada. Faltam fotos, datas, WhatsApp, alguns nomes de pets e 4 tutores.
- **Ideia:** depois do A-01, marcar a situação em lote. As fotos podem ser enviadas para o Claude colocar.

### C-03 · Proteção de senha vazada no login 🟡
- **Origem:** Claude, aviso do Supabase. Ligar "Leaked password protection" em Auth → Passwords. Um clique, sem custo.

### C-04 · Assistente e valores pela API ⏸️
- **Origem:** Claude. A assistente não vê valores nas telas, mas, tecnicamente, consegue ler o valor das propostas aceitas pela API. Isso só importa se um dia entrar alguém de fora da família.
- **Ideia:** uma view sem colunas de valor para a assistente.

## Histórico
| Data | O quê |
|---|---|
| 10/11/2026 | Criado com A-01, A-02, A-03 (Bruno) e C-01 a C-04 (observados) |
