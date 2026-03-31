# NT Mecânicos - Resumo do Projeto

## Visão Geral

App PWA mobile-first para gestão de campo de técnicos/mecânicos da **Nova Tratores**.

**Stack:**
- Next.js 16.2.1 + React 19 + TypeScript
- Tailwind CSS 4 (via PostCSS)
- Supabase (auth + banco de dados + realtime)
- Lucide React (ícones)
- PWA (manifest.json, standalone, portrait)

---

## Arquitetura de Rotas

### Técnico (Mobile - raiz `/`)

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/` | `(tecnico)/page.tsx` | Painel do técnico: saudação estilo "Olá, Nome", grid 2x2 de ícones (OS, Agenda, Requisições, Config), resumo do dia, agenda de hoje |
| `/requisicoes` | `(tecnico)/requisicoes/page.tsx` | Duas abas: "Solicitar" (nova requisição) e "Atualizar" (pendentes de comprovante) |
| `/requisicoes/nova` | `(tecnico)/requisicoes/nova/page.tsx` | Formulário completo de solicitação (insere na `Supa-Solicitacao_Req`) |
| `/requisicoes/atualizar/[id]` | `(tecnico)/requisicoes/atualizar/[id]/page.tsx` | Atualizar requisição aprovada: valor, fornecedor, foto comprovante (insere na `Supa-AtualizarReq`) |
| `/requisicoes/[id]` | `(tecnico)/requisicoes/[id]/page.tsx` | Detalhe da requisição (visualização + edição se pendente/recusada) |
| `/os` | `(tecnico)/os/page.tsx` | Lista de OS do técnico (filtrada por Os_Tecnico/Os_Tecnico2) + busca por nº |
| `/os/[id]` | `(tecnico)/os/[id]/page.tsx` | Detalhe da OS: cliente, tipo, técnico, botão preencher/editar OS Técnica |
| `/os/[id]/preencher` | `(tecnico)/os/[id]/preencher/page.tsx` | Formulário completo de OS Técnica (10 seções, fotos, assinaturas canvas) |
| `/agenda` | _(a criar)_ | Agenda pessoal do técnico |
| `/perfil` | _(a criar)_ | Perfil do técnico |

**Layout:** `HeaderMobile` (logo + sino de notificações, fundo vermelho `#C41E2A`) + `BottomNavTecnico` (2 abas: Início, Perfil)

### Admin (PC - `/admin`)

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/admin` | `admin/page.tsx` | Dashboard admin: totais do dia, resumo por técnico, atrasos |
| `/admin/agenda` | `admin/agenda/page.tsx` | Agenda semanal de todos os técnicos (filtro por técnico, navegação semanal) |
| `/admin/os` | `admin/os/page.tsx` | Lista de todas as OS (busca, filtro por técnico, toggle concluídas) |
| `/admin/os/[id]` | `admin/os/[id]/page.tsx` | Detalhe da OS + lista de execuções |
| `/admin/os/[id]/execucao` | `admin/os/[id]/execucao/page.tsx` | Redirect → detalhe da OS |
| `/admin/requisicoes` | `admin/requisicoes/page.tsx` | Todas as requisições (filtro por status e técnico, realtime) |
| `/admin/requisicoes/[id]` | `admin/requisicoes/[id]/page.tsx` | Detalhe + botões aprovar/recusar |
| `/admin/requisicoes/nova` | `admin/requisicoes/nova/page.tsx` | Redirect → lista |
| `/admin/tecnicos` | `admin/tecnicos/page.tsx` | Lista de técnicos com métricas (OS, agenda, atrasos) |
| `/admin/perfil` | `admin/perfil/page.tsx` | Redirect → /admin/tecnicos |

**Layout:** `HeaderAdmin` (logo + badge ADMIN) + `BottomNav` (5 abas: Painel, Agenda, Ordens, Requisições, Técnicos)

### Outras rotas

| Rota | Descrição |
|------|-----------|
| `/login` | Tela de login (auth Supabase por email/senha, valida se user está em `mecanico_usuarios`) — atualmente bypassed, app carrega direto |

---

## Estrutura de Arquivos

```
src/
├── app/
│   ├── layout.tsx              # Root layout (meta PWA, tema #C41E2A, lang pt-BR)
│   ├── globals.css             # CSS global, variáveis de cor (primária: vermelho), animações
│   ├── login/page.tsx          # Login com Supabase auth (bypassed atualmente)
│   ├── (tecnico)/              # Route group - Área do mecânico (mobile, raiz /)
│   │   ├── layout.tsx          # HeaderMobile + BottomNavTecnico + useCurrentUser + notificações
│   │   ├── page.tsx            # Painel do técnico (estilo app Garage)
│   │   ├── requisicoes/
│   │   │   ├── page.tsx        # Abas Solicitar / Atualizar
│   │   │   ├── nova/page.tsx   # Formulário de nova solicitação (12 tipos, campos condicionais)
│   │   │   ├── atualizar/
│   │   │   │   └── [id]/page.tsx  # Atualizar req: valor + fornecedor + foto comprovante
│   │   │   └── [id]/page.tsx   # Detalhe + edição da requisição
│   │   └── os/
│   │       ├── page.tsx        # Lista de OS do técnico + busca
│   │       ├── [id]/page.tsx   # Detalhe da OS
│   │       └── [id]/preencher/page.tsx  # Formulário OS Técnica (10 seções)
│   └── admin/                  # Área admin (PC, /admin)
│       ├── layout.tsx          # HeaderAdmin + BottomNav + badge requisições pendentes
│       ├── page.tsx            # Dashboard admin
│       ├── agenda/page.tsx
│       ├── os/page.tsx
│       ├── os/[id]/page.tsx
│       ├── os/[id]/execucao/page.tsx
│       ├── requisicoes/page.tsx
│       ├── requisicoes/[id]/page.tsx
│       ├── requisicoes/nova/page.tsx
│       ├── perfil/page.tsx
│       └── tecnicos/page.tsx
├── components/
│   ├── HeaderAdmin.tsx         # Header fixo com logo + badge ADMIN
│   ├── HeaderMobile.tsx        # Header vermelho com logo grande + sino de notificações
│   ├── BottomNav.tsx           # Nav inferior admin (links /admin/...)
│   ├── BottomNavTecnico.tsx    # Nav inferior técnico (2 abas: Início, Perfil)
│   ├── FotoUpload.tsx          # Upload de foto com câmera, preview, remove
│   └── SignaturePad.tsx        # Assinatura por toque (canvas), limpar
├── hooks/
│   ├── useAuth.ts              # Lista todos os técnicos ativos
│   ├── useCurrentUser.ts       # Identifica o mecânico (sessão → mecanico_usuarios → Tecnicos_Appsheet → fallback)
│   └── useNotificacoes.ts      # Notificações realtime via Supabase channels + Web Notification API
└── lib/
    ├── supabase.ts             # Cliente Supabase (NEXT_PUBLIC_SUPABASE_URL + ANON_KEY)
    ├── types.ts                # Interfaces TypeScript (todas as entidades)
    └── constants.ts            # Constantes (turnos, status agenda, status requisição, fases OS)
```

---

## Tabelas Supabase

### Tabelas do App Mecânicos

| Tabela | Finalidade |
|--------|-----------|
| `mecanico_usuarios` | Perfis dos técnicos (id, tecnico_nome, tecnico_email, telefone, avatar_url, ativo) |
| `agenda_tecnico` | Agendamentos por técnico/dia (data, turno, horários, cliente, endereço, status) |
| `Ordem_Servico` | Ordens de serviço (Os_Tecnico, Os_Tecnico2, Os_Cliente, Status, etc.) |
| `os_tecnico_execucao` | Registros de execução das OS (horários, horímetro, km, serviço, fotos, assinatura) |
| `mecanico_requisicoes` | Requisições de material (material, quantidade, urgência, motivo, status, aprovação) |
| `mecanico_notificacoes` | Notificações em tempo real (tipo, título, descrição, link, lida) |

### Tabelas Compartilhadas com o Portal

| Tabela | Finalidade |
|--------|-----------|
| `Tecnicos_Appsheet` | Lista de técnicos (UsuNome, UsuEmail, UsuTelefone) — usada para identificar o técnico logado |
| `Supa-Solicitacao_Req` | Solicitações de requisição enviadas pelo app (portal escuta via realtime e imprime) |
| `Supa-AtualizarReq` | Atualizações de requisição (valor, foto nota) — portal escuta e atualiza a Requisicao |
| `Requisicao` | Tabela principal de requisições do portal (titulo, tipo, status, fornecedor, valor, etc.) |
| `Fornecedores` | Cadastro de fornecedores (nome, numero, cpf/cnpj, descricao) |
| `SupaPlacas` | Frota de veículos (IdPlaca, NumPlaca) |
| `Ordem_Servico_Tecnicos` | OS Técnica preenchida pelo mecânico (dados de execução, fotos, assinaturas, status rascunho/enviado) — SQL em `sql_criar_tabela_os_tecnicos.sql` |

---

## Fluxo de Requisições

### 1. Solicitação (Técnico → Portal)
1. Técnico abre `/requisicoes` → aba "Solicitar" → "Nova Solicitação"
2. Preenche: Material/Serviço, Motivo, Tipo (12 opções)
3. Campos condicionais aparecem conforme o tipo:
   - **Ferramenta** → Uso Pessoal ou Geral
   - **Trator-Cliente** → Cliente + OS (do técnico) + Modelo/Chassis (obrigatórios)
   - **Trator-Loja** → Modelo/Chassis (obrigatório)
   - **Veicular Abastecimento / Manutenção** → Veículo (da `SupaPlacas`) + Km (obrigatórios)
   - **Trator Abastecimento / Quadri Abastecimento** → Modelo/Chassis + Horímetro (obrigatórios)
   - **Peças, Alimentação, Serv. Terceiros, Almoxarifado, Insumo Infra** → Sem campos extras
4. Insere na `Supa-Solicitacao_Req`
5. Portal recebe via Supabase Realtime, imprime automaticamente

### 2. Aprovação (Portal)
- Equipe do escritório analisa, aprova/recusa no portal
- Requisição fica na tabela `Requisicao` com status `pedido` → `completa`

### 3. Atualização (Técnico → Portal)
1. Técnico abre `/requisicoes` → aba "Atualizar"
2. Vê lista de requisições aprovadas sem comprovante
3. Clica na requisição → preenche: Valor, Fornecedor (autocomplete da tabela `Fornecedores`), Foto do comprovante (câmera/galeria, upload Supabase Storage)
4. Insere na `Supa-AtualizarReq` + atualiza `Requisicao` diretamente
5. Portal recebe via Supabase Realtime

---

## Interfaces TypeScript (src/lib/types.ts)

- `MecanicoProfile` — perfil do técnico
- `AgendaItem` — item da agenda (status: agendado, em_andamento, concluido, cancelado)
- `OrdemServico` — ordem de serviço completa
- `Execucao` — registro de execução (status: rascunho, enviado)
- `MecanicoRequisicao` — requisição de material (status: pendente, aprovada, recusada, atualizada)
- `OrdemServicoTecnico` — OS Técnica completa (técnicos, datas/horas/km até 3 dias, fotos, assinaturas, status)
- `MecanicoNotificacao` — notificação

---

## Constantes (src/lib/constants.ts)

- `TURNOS` — manhã (07-12), tarde (13-17:30), integral (07-17:30)
- `STATUS_AGENDA` — cores e labels para agendado, em_andamento, concluido, cancelado
- `STATUS_REQUISICAO` — cores e labels para pendente, aprovada, recusada, atualizada
- `FASES_OS` — 11 fases possíveis de uma OS (Orçamento → Concluída/Cancelada)

---

## Tema / Design

- **Cor primária:** `#C41E2A` (vermelho)
- **Cor primária light:** `#E02D3A`
- **Accent:** `#1E3A5F` (azul escuro)
- **Success:** `#10B981` / **Warning:** `#F59E0B` / **Danger:** `#EF4444`
- **Border radius:** 14-18px (cards), 20px (pills)
- **Mobile-first:** safe-area insets, overscroll-behavior: none, tap-highlight: transparent
- **Font:** -apple-system, BlinkMacSystemFont, Segoe UI, Roboto
- **Painel estilo app "Garage":** saudação com badge, grid 2x2 de ícones, cards de resumo coloridos

---

## Autenticação

- Login via Supabase auth (email/senha) existe mas está **bypassed** para desenvolvimento
- `useCurrentUser` tenta: sessão auth → `Tecnicos_Appsheet` → fallback "Técnico"
- Timeout de 5s em cada tentativa para nunca travar o app
- OS filtradas por `Os_Tecnico` / `Os_Tecnico2` = nome do técnico logado

---

## Funcionalidades Implementadas

### Técnico (Mobile)
- [x] Painel pessoal estilo app (grid 2x2 ícones, resumo do dia, agenda)
- [x] Solicitação de requisição (12 tipos, campos condicionais, integração portal)
- [x] Atualização de requisição (valor, fornecedor com autocomplete, foto comprovante)
- [x] Detalhe da requisição (visualizar + atualizar se pendente/recusada)
- [x] Notificações em tempo real (sino com badge, painel lateral, Web Notification API)
- [x] Bottom nav simplificada (Início + Perfil)
- [x] Minhas OS (lista filtrada por técnico + busca por nº da OS)
- [x] Detalhe da OS (info do cliente, tipo, técnico, botão preencher)
- [x] Preenchimento de OS Técnica (10 seções: técnico, serviço, datas/horas/km até 3 dias, garantia, veículo, local trator, 7 fotos equipamento, 4 fotos falha, 4 fotos peças, 2 assinaturas canvas, responsável)
- [ ] Agenda pessoal
- [ ] Perfil

### Admin (PC)
- [x] Dashboard com visão geral (totais do dia, resumo por técnico, atrasos)
- [x] Agenda de todos os técnicos (semana, filtro por técnico)
- [x] Lista de todas as OS (busca, filtros, toggle concluídas)
- [x] Detalhe da OS com execuções
- [x] Lista de requisições (filtro status + técnico, realtime)
- [x] Aprovar/recusar requisições
- [x] Lista de técnicos com métricas

---

## PWA

- `manifest.json`: name "Nova Tratores - Mecânicos", standalone, portrait, tema `#C41E2A`
- Apple touch icon: `/Logo_Nova.png`
- Viewport: largura device, sem zoom do usuário

---

## Integração com Portal (C:\projetos\portal)

O app mecânicos se integra com o portal da Nova Tratores:
- **Tabela de técnicos:** `Tecnicos_Appsheet` (mesma usada pelo portal para selecionar técnicos)
- **Requisições:** Escrita nas tabelas `Supa-Solicitacao_Req` e `Supa-AtualizarReq` que o portal escuta via Supabase Realtime
- **Fornecedores:** Leitura da tabela `Fornecedores` (cadastro gerenciado pelo portal)
- **Veículos:** Leitura da tabela `SupaPlacas` (frota gerenciada pelo portal)
- **OS:** Leitura da tabela `Ordem_Servico` (filtrada pelo técnico logado)
- **OS Técnica:** Escrita na tabela `Ordem_Servico_Tecnicos` (preenchida pelo técnico no campo)

---

## Fluxo de OS Técnica

1. Técnico abre `/os` → vê suas OS pendentes
2. Clica em uma OS → tela de detalhe com info do cliente
3. Clica "Preencher OS Técnica" → formulário com 10 seções:
   - Técnico responsável (opção para 2º técnico)
   - Motivo e Tipo de serviço (com revisão e projeto)
   - Datas/Horas/Km (até 3 dias, com totais automáticos)
   - Garantia, Horímetro
   - Fotos do veículo (7: horímetro, chassis, frente, direita, esquerda, traseira, volante)
   - Local do trator (endereço + coordenadas)
   - Fotos de falha (até 4)
   - Fotos de peças (2 novas + 2 instaladas)
   - Assinaturas (cliente + técnico via canvas touch)
   - Nome do responsável
4. Salva como **rascunho** ou **envia** definitivamente
5. Dados salvos na tabela `Ordem_Servico_Tecnicos`

---

## Correções aplicadas no Portal (C:\projetos\portal)

### Relatório POS - Descrição do Serviço
- Adicionada seção "Descrição do Serviço Realizado" (`Serv_Realizado`) no relatório de impressão da OS
- Arquivo: `src/app/api/pos/ordens/[id]/print/route.ts`

### Notificações Realtime - Correções (useNotificacoes.ts)
- **Canal com nome único** (`+ Date.now()`) para evitar conflito ao remontar componente
- **Error handling** no `.subscribe()` com logs de status (SUBSCRIBED, CHANNEL_ERROR, TIMED_OUT, CLOSED)
- **Retry automático** (3s) em caso de erro ou desconexão
- **Reload ao voltar à aba** para pegar notificações perdidas durante desconexão
- **Criação de `portal_notificacoes`** quando requisições chegam via realtime (notifica admins pelo bell icon)

### Chat Realtime - Correções (useChat.ts)
- **Canal com nome único** (`+ Date.now()`) para evitar duplicação silenciosa
- **Error handling** no `.subscribe()` com logs de status
- **Retry automático** (3s) em caso de CHANNEL_ERROR, TIMED_OUT ou CLOSED — reconecta automaticamente
- **Reload de chats ao voltar à aba** — recarrega lista de chats quando o usuário volta ao foco do navegador

### Requisições Realtime - Correções (requisicoes/page.tsx)
- **Canal com nome único** (`+ Date.now()`)
- **Error handling** no `.subscribe()` com logs
- **Notificação de admins** via `portal_notificacoes` quando nova solicitação ou atualização chega (bell icon)

### Tabelas na publicação realtime (Supabase)
- `Supa-Solicitacao_Req`, `Supa-AtualizarReq`, `Requisicao` — já estavam na publicação (verificado)
- `portal_mensagens`, `portal_chat_leitura`, `portal_notificacoes` — já estavam na publicação (verificado)
- SQL de verificação: `SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';`

### Arquivos do portal modificados
- `src/hooks/useNotificacoes.ts` — retry + error handling + reload on focus
- `src/hooks/useChat.ts` — retry + error handling + reload on focus
- `src/app/(portal)/requisicoes/page.tsx` — canal único + error handling + notificar admins
- `src/app/api/pos/ordens/[id]/print/route.ts` — adicionado Serv_Realizado
- `sql/fix-realtime-requisicoes.sql` — SQL para publicação (já estava ok)

---

## Sistema de Pontuação / Comissão de Técnicos

### Conceito
Cada técnico começa o mês com **40 pontos**. Os pontos representam diretamente a **% de comissão mensal**. Falhas (atrasos, falta de requisição, etc.) deduzem pontos automaticamente ou manualmente pelo admin. O técnico pode justificar, e o admin decide se perdoa ou mantém a penalidade.

### Níveis (Pontos = % Comissão)

| Pontos | Nível | Cor |
|--------|-------|-----|
| 35 – 40 | Excelente | Verde `#10B981` |
| 30 – 35 | Bom | Azul `#3B82F6` |
| 25 – 30 | Regular | Amarelo `#F59E0B` |
| 20 – 25 | Atenção | Laranja `#F97316` |
| 0 – 20 | Crítico | Vermelho `#EF4444` |

### Regras de Penalidade

| Infração | Tipo | Dedução |
|----------|------|---------|
| OS atrasada | Automática | -1 ponto **por dia** de atraso (a partir do dia seguinte à `Previsao_Execucao`) |
| Requisição atrasada para atualizar | Automática | -1 ponto **por dia** (status `pedido` sem `recibo_fornecedor`) |
| Nota sem requisição (fornecedor entregou sem req) | Manual (admin) | Admin define valor |
| Outras infrações | Manual (admin) | Admin define valor + descrição |

### Fluxo de Justificativa

1. **Sistema detecta atraso** → cria penalidade automática diária
2. **Técnico atualiza o item atrasado** → obrigatório preencher justificativa do atraso
3. **Admin recebe na fila de revisão** → vê penalidade + justificativa
4. **Admin decide:**
   - **Aprovar** (justificativa plausível) → devolve os pontos deduzidos
   - **Aprovar parcial** → devolve parte dos pontos
   - **Rejeitar** → mantém a dedução
5. **Penalidade manual** → admin adiciona direto com descrição (ex: "Nota do fornecedor X sem requisição")

### Reset Mensal
- Dia 1 de cada mês: todos os técnicos voltam a 40 pontos
- Mês anterior fica salvo como histórico (fechado)

---

## Painel Admin Embeddable (Portal)

### Conceito
O painel admin do NT Mecânicos será embutido no portal POS via **iframe**. Um card "NT Mecânicos" no portal abre o painel. Quem é admin no portal tem acesso automático.

### Autenticação do Embed
1. Portal gera um **token curto** (válido ~8h) via Edge Function `gerar-token-embed`
2. Iframe carrega: `https://app.novatratores.com.br/admin/embed/pontuacao?token=abc123`
3. Hook `useEmbedAuth` valida o token contra tabela `portal_embed_tokens`
4. Layout embed é **limpo** (sem header/menu do app, sem BottomNav) — blende com o portal

### Rotas Embed

| Rota | Descrição |
|------|-----------|
| `/admin/embed` | Dashboard embeddable (overview) |
| `/admin/embed/pontuacao` | Visão geral pontuação de todos os técnicos |
| `/admin/embed/pontuacao/[tecnico]` | Detalhe pontuação + histórico de penalidades do técnico |
| `/admin/embed/justificativas` | Fila de justificativas pendentes para revisão |

### Headers para iframe
```
X-Frame-Options: ALLOWALL (apenas para /admin/embed/*)
Content-Security-Policy: frame-ancestors 'self' https://portal.novatratores.com.br
```

---

## Tabelas SQL — Sistema de Pontuação

### `pontuacao_mensal` — Score mensal por técnico

```sql
CREATE TABLE IF NOT EXISTS pontuacao_mensal (
  id BIGSERIAL PRIMARY KEY,
  tecnico_nome TEXT NOT NULL,
  mes INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  pontos_iniciais NUMERIC(5,2) NOT NULL DEFAULT 40,
  pontos_atuais NUMERIC(5,2) NOT NULL DEFAULT 40,
  nivel TEXT NOT NULL DEFAULT 'Excelente',
  fechado BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tecnico_nome, mes, ano)
);

CREATE INDEX idx_pontuacao_mensal_tecnico ON pontuacao_mensal (tecnico_nome, ano, mes);
```

### `penalidades` — Cada dedução (automática ou manual)

```sql
CREATE TABLE IF NOT EXISTS penalidades (
  id BIGSERIAL PRIMARY KEY,
  pontuacao_mensal_id BIGINT NOT NULL REFERENCES pontuacao_mensal(id),
  tecnico_nome TEXT NOT NULL,
  tipo TEXT NOT NULL,                -- 'os_atrasada', 'req_atrasada', 'nota_sem_req', 'manual'
  referencia_tipo TEXT,              -- 'Ordem_Servico', 'Requisicao', null
  referencia_id TEXT,                -- Id_Ordem ou id da requisição
  descricao TEXT NOT NULL,
  pontos_deduzidos NUMERIC(5,2) NOT NULL DEFAULT 0,
  data_ocorrencia DATE NOT NULL DEFAULT CURRENT_DATE,
  automatica BOOLEAN NOT NULL DEFAULT TRUE,
  justificativa TEXT,
  justificativa_data TIMESTAMPTZ,
  status_revisao TEXT NOT NULL DEFAULT 'pendente',  -- 'pendente', 'aprovada', 'rejeitada'
  revisado_por TEXT,
  revisao_data TIMESTAMPTZ,
  revisao_obs TEXT,
  pontos_restaurados NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_penalidades_tecnico ON penalidades (tecnico_nome, data_ocorrencia);
CREATE INDEX idx_penalidades_revisao ON penalidades (status_revisao) WHERE status_revisao = 'pendente';
CREATE INDEX idx_penalidades_mensal ON penalidades (pontuacao_mensal_id);
```

### `portal_embed_tokens` — Tokens para iframe do portal

```sql
CREATE TABLE IF NOT EXISTS portal_embed_tokens (
  id BIGSERIAL PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  admin_email TEXT NOT NULL,
  admin_nome TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_portal_tokens ON portal_embed_tokens (token) WHERE expires_at > now();
```

---

## Autenticação Unificada Portal ↔ Mecânicos

### Conceito
O portal é a **fonte única de verdade** para acessos ao app mecânicos. Não existe mais auto-cadastro no app — todos os usuários são gerenciados pela página admin do portal.

### Papéis no App Mecânicos

| Papel | Acesso | Como é definido |
|-------|--------|-----------------|
| **Admin** | Total (área admin + técnico) | `portal_permissoes.is_admin = true` |
| **Técnico** | Criar OS, requisições, preencher formulários | `portal_permissoes.mecanico_role = 'tecnico'` |
| **Observador** | Apenas visualização (sem criar/editar) | `portal_permissoes.mecanico_role = 'observador'` |
| Sem acesso | Bloqueado ("Solicite ao administrador") | `mecanico_role = NULL` |

### Schema — Colunas adicionadas em `portal_permissoes`

```sql
ALTER TABLE portal_permissoes
  ADD COLUMN mecanico_role TEXT CHECK (mecanico_role IN ('tecnico', 'observador')),
  ADD COLUMN mecanico_tecnico_nome TEXT;
```

- `mecanico_role`: papel no app (`tecnico`, `observador`, ou NULL = sem acesso)
- `mecanico_tecnico_nome`: nome da `Tecnicos_Appsheet` vinculado (para filtrar OS por técnico)

### Fluxo de Login

1. Usuário abre o app → tela de login (mesmas credenciais do portal)
2. App checa `portal_permissoes`:
   - `is_admin = true` → redireciona para `/admin`
   - `mecanico_role = 'tecnico'` ou `'observador'` → redireciona para `/`
3. Fallback: checa `mecanico_usuarios` (legado)
4. Se não encontra nada → "Sem acesso ao app. Solicite ao administrador do portal."

### Gerenciamento pelo Portal

Na página **Administração** (`/admin`) do portal:
- Nova coluna **"APP MECÂNICOS"** na tabela de usuários
- Seletor: Sem acesso / Técnico / Observador
- Quando "Técnico": dropdown com nomes da `Tecnicos_Appsheet` para vincular
- Auto-adiciona módulo `painel-mecanicos` ao atribuir papel
- Novo card de stat "MECÂNICOS APP" no topo

### Hooks Modificados (App Mecânicos)

| Hook | Mudança |
|------|---------|
| `useAdmin` | Checa `portal_permissoes.is_admin` primeiro, fallback `mecanico_usuarios` |
| `useCurrentUser` | Checa `portal_permissoes.mecanico_role` primeiro, fallback `mecanico_usuarios` |

### Arquivos Modificados

**Portal:**
- `src/app/(portal)/admin/page.tsx` — coluna mecânicos + dropdown técnico + stat card

**App Mecânicos:**
- `src/hooks/useAdmin.ts` — portal_permissoes check + fallback legado
- `src/hooks/useCurrentUser.ts` — portal_permissoes check + fallback legado
- `src/app/login/page.tsx` — removido auto-cadastro, só login com credenciais do portal
- `src/lib/types.ts` — campo `mecanico_role` adicionado ao `MecanicoProfile`
- `sql_integrar_portal_mecanicos.sql` — SQL de migração

### RLS Policies Adicionadas

```sql
-- Usuário lê sua própria permissão (app mecânicos precisa disso)
CREATE POLICY "Users can read own permissoes" ON portal_permissoes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can read own profile" ON financeiro_usu FOR SELECT USING (auth.uid() = id);
```

### Deploy

- App mecânicos hospedado no **Vercel (free tier)**: `https://mecanicos-nine.vercel.app`
- PWA instalável (Service Worker + manifest.json com ícones 192/512px)
- HTTPS automático (obrigatório para PWA)

### PWA — Arquivos adicionados

| Arquivo | Descrição |
|---------|-----------|
| `public/sw.js` | Service Worker com cache network-first |
| `src/components/ServiceWorkerRegister.tsx` | Registra o SW no client-side |

---

## Vinculação Requisição ↔ Ordem de Serviço

### Conceito
Requisições podem ser vinculadas a uma OS. O valor cobrado do cliente (`valor_cobrado_cliente`) de cada requisição vinculada soma no total da OS. Ao enviar para o Omie, cada requisição gera um serviço com código "div.".

### Como funciona

1. **App técnico** (`requisicoes/nova/page.tsx`): se setor = "Trator-Cliente", aparece dropdown de OS abertas
2. **Portal FormReq.tsx** (criação): dropdown searchable com OS abertas (busca por nº, cliente, técnico)
3. **Portal CardReq.tsx** (edição): mesmo dropdown, permite trocar ou remover vínculo a qualquer momento
4. **Campo usado**: `Requisicao.ordem_servico` armazena o `Id_Ordem` da OS vinculada
5. **Legado**: campo `Ordem_Servico.Id_Req` (comma-separated) ainda é suportado para requisições antigas do AppSheet

### Cálculo de valor no POS
- GET `/api/pos/ordens/[id]`: busca requisições de ambos os sistemas (legado + novo)
- PATCH `/api/pos/ordens/[id]`: soma `valor_cobrado_cliente` (não `valor_despeza`) das requisições vinculadas no total
- `total = vHoras + vKm + vPecas + vReq - desc - descHora - descKm`

### Desvinculação (admin)
- OSDrawer: botão "Desvincular" → pede justificativa obrigatória
- API `POST /api/pos/requisicoes/desvincular`: seta `ordem_servico = null`, grava `desvinculado_justificativa`, `desvinculado_por`, `desvinculado_em`
- SQL: `sql_vincular_requisicao_os.sql` (colunas de desvinculação na tabela Requisicao)

### Envio para Omie
- `omie.ts` → `montarServicosComReqs()`: busca requisições vinculadas com `valor_cobrado_cliente > 0`
- Cria item de serviço com código "div." (buscado via API Omie), descrição = título da requisição, valor = valor cobrado
- Busca `nCodServ` do "div." via `ConsultarServico` ou `ListarServicos`

---

## Auto-move de Status (Datas de Execução)

### Lógica (`ordens/route.ts` → `autoMoveByDate()`)
Roda a cada 5 minutos no GET das ordens:

1. **Orçamento → Execução**: quando `Previsao_Execucao` <= hoje
2. **Execução → Aguardando ordem Técnico**: quando `Previsao_Execucao` < ontem, **MAS** só se não houver datas futuras na `agenda_tecnico` para a OS
3. **Executada aguardando comercial → Executada aguardando cliente**: quando `Previsao_Faturamento` <= hoje

### Múltiplas datas de execução
- A OS pode ter várias datas na `agenda_tecnico` (principal + extras)
- O auto-move verifica: se ainda existe `data_agendada >= hoje` na agenda, NÃO move para "Aguardando ordem Técnico"
- Isso evita mover uma OS que ainda tem dias de execução agendados

---

## Relatório Técnico no POS

### Fluxo
1. Técnico preenche e envia OS em `/os/[id]/preencher`
2. PDF é gerado automaticamente e salvo no Storage (`relatorios-os/{id}/`)
3. URL salva em `Ordem_Servico.ID_Relatorio_Final`
4. **Status da OS muda para "Executada aguardando cliente"** automaticamente
5. **PPVs vinculados** atualizados para "Aguardando Para Faturar"

### Exibição no POS (OSDrawer)
- Card "Relatório Técnico" com link verde clicável que abre o PDF
- Card "Dados do Técnico" com:
  - Info: diagnóstico, serviço realizado, chassis, horímetro, horas/km, responsável
  - Peças extras (se houver) com justificativa
  - Fotos organizadas por categoria: **Identificação** (horímetro, chassis), **Equipamento** (frente, direita, esquerda, traseira, volante), **Falha/Defeito** (falha 1-4), **Peças** (nova 1-2, instalada 1-2)
  - Assinaturas (cliente + técnico)
  - Modal de foto expandida ao clicar

---

## Formulário OS Técnica (Reformulado)

### Tipos de Serviço
Manutenção, Revisão, Montagem Implemento, Garantia, Entrega Técnica, Inspeção Pré Entrega

### Estrutura de seções (ordem)
1. **Dados do POS** (somente leitura) — cliente, CPF, endereço, horas/km, descrição, projeto, PPV
2. **Técnico Responsável** — técnico principal (readonly) + opção 2º técnico
3. **Diagnóstico e Serviço** — diagnóstico, serviço realizado, tipo de serviço, tipo revisão (só se Revisão: dropdown de horas)
4. **Identificação do Equipamento** — projeto (se tiver), final do chassis (escrito), horímetro (escrito)
5. **Datas / Horas / Deslocamento** — até 3 dias, totais automáticos
6. **Veículo** — placa do veículo utilizado
7. **Fotos** — horímetro + chassis (sempre obrigatórias)
8. **Fotos de Garantia** (só se tipo = "Garantia") — equipamento (5 ângulos), falha (até 4), peças (nova + instalada)
9. **Assinaturas** — técnico (assinatura digital), cliente (assinatura digital OU foto)
10. **Responsável** — nome do responsável pelo trator (cliente)
11. **Peças/Serviços Extras** (no final, não obrigatório) — se adicionar, obrigatório justificar "por que não avisou antes"

### Componentes atualizados
- **FotoUpload.tsx**: dois botões — "Tirar foto" (câmera) e "Galeria" (escolher do celular)
- **SignaturePad.tsx**: prop `allowPhoto` — toggle "Assinar / Foto" para escolher entre assinatura digital ou foto

---

## Notificações Portal ← App Técnico

### Helper compartilhado (`src/lib/notificarPortal.ts`)
```typescript
notificarPortalReq(titulo, descricao)
```
- Busca `portal_permissoes` onde `is_admin = true` OU `modulos_permitidos` inclui "requisicoes"
- Insere em `portal_notificacoes` para cada usuário encontrado

### Eventos notificados
- Técnico **cria** requisição (`requisicoes/nova/page.tsx`)
- Técnico **atualiza** requisição (`requisicoes/atualizar/[id]/page.tsx`)
- Técnico **solicita cancelamento** (`requisicoes/page.tsx`)

---

## UI/UX — Redesign (App Técnico)

### Home (`(tecnico)/page.tsx`)
Ordem: Saudação → "Seu dia" (plano de hoje) → Ações (mensagem + botões) → "O que você precisa?" (guia) → Pendências

### Ordens (`(tecnico)/os/page.tsx`)
Header compacto + "Novo Caminho", 3 cards resumo (Pendentes/Atrasadas/Enviadas), tabs iOS-style, cards limpos

### Requisições (`(tecnico)/requisicoes/page.tsx`)
Header compacto + "Nova", 3 cards resumo (Pendentes/Em aberto/Histórico), tabs mínimas, cards limpos

### Bottom Nav (`BottomNavTecnico.tsx`)
Barra fixa inferior com ícone + texto: "Início", "Ordens", "Requisições", "Agenda", "Perfil". Indicador vermelho no ativo.

---

## Fases de Implementação — Sistema de Pontuação

### Fase 1: Base (Tabelas + Tipos + Helpers)
- Criar tabelas SQL (`pontuacao_mensal`, `penalidades`, `portal_embed_tokens`)
- Adicionar interfaces em `types.ts`: `PontuacaoMensal`, `Penalidade`, `NivelInfo`
- Criar `src/lib/pontuacao.ts`: constantes de níveis, função `getNivel()`, helpers
- Adicionar constantes em `constants.ts`: `NIVEIS_PONTUACAO`, `TIPOS_PENALIDADE`

### Fase 2: Dashboard Admin Pontuação
- Hook `usePontuacao.ts` — busca scores mensais com realtime
- Componentes: `ScoreCard`, `ScoreBadge`, `NivelIndicator`, `PenalidadeCard`
- Página `/admin/pontuacao` — overview de todos os técnicos com score atual
- Página `/admin/pontuacao/[tecnico]` — detalhe do técnico + histórico + formulário penalidade manual

### Fase 3: Justificativas (Admin)
- Componente `PenalidadeReview` — card de revisão (aprovar/rejeitar/parcial)
- Página `/admin/justificativas` — fila de pendentes
- Badge de justificativas pendentes no menu admin

### Fase 4: Lado do Técnico
- Página `/pontuacao` — técnico vê próprio score + nível + histórico
- Componente `JustificativaForm` — modal para justificar atraso
- Modificar fluxos de atualização de OS e requisição para exigir justificativa quando atrasado
- Badge de score na home do técnico

### Fase 5: Engine Automática de Penalidades
- Supabase Edge Function `calcular-penalidades-diarias` — cron diário
- Supabase Edge Function `reset-mensal` — cron dia 1 de cada mês
- Evita duplicatas (verifica se penalidade já existe para item+data)

### Fase 6: Embed no Portal
- Hook `useEmbedAuth` — valida token do portal
- Layout `/admin/embed/layout.tsx` — limpo, sem header/menu
- Páginas embed reutilizam mesmos componentes das páginas admin
- Edge Function `gerar-token-embed` — portal chama para gerar token
- Headers iframe no `next.config.ts`

### Fase 7: Polish + Notificações
- Notificar técnico quando penalidade é aplicada/revisada
- Notificar admin quando justificativa é enviada
- Seletor de mês histórico no dashboard
- Realtime subscriptions no dashboard de pontuação
