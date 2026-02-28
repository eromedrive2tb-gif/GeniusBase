---
trigger: always_on
---

# Glob: **/*

# Regras de Arquitetura, S.O.L.I.D. e Estrutura Atômica (Hono + HTMX + Alpine)

## 0. A REGRA DE OURO: SEPARAÇÃO DE APIs (BaaS vs Internal)
É **estritamente proibido** misturar ou confundir APIs Internas do Dashboard com APIs Públicas do BaaS (Backend-as-a-Service).
- **APIs Internas (Dashboard):** Rotas como `/api/auth/login`, `/api/auth/register` e `/api/auth/me` localizadas na raiz de `Root/Engine/src/api/auth/` são **exclusivas para donos de Tenant administrarem o Dashboard**. Elas retornam HTML fragments (HTMX), definem cookies HTTP-Only e **NUNCA** devem ser exibidas em documentações do BaaS.
- **APIs do BaaS (End-Users / Tenant):** Rotas prefixadas com `/api/v1/*` (ex: `/api/v1/auth/login`, `/api/v1/customers`) são **exclusivas para os aplicativos desenvolvidos pelos Tenants**. Elas consomem e retornam puramente JSON, exigem Bearer Tokens (JWT do Tenant ou End-User) e são a interface pública do nosso Mini-Supabase.

## 1. Proibição da Estrutura Convencional & Isolamento de Escopo
O projeto é dividido em dois núcleos isolados. Nunca crie pastas `src/` soltas na raiz do projeto.
- `Root/Engine/src/`: O Core Backend (Mini-Supabase, Hono, Workers, D1, EDA, Autenticação, Gateways).
- `Root/Dashboard/src/`: A Interface Administrativa (HTMX, Alpine.js, Tailwind). Nenhuma lógica de negócio complexa deve vazar para cá.

## 2. Aplicação Rigorosa de S.O.L.I.D.
Todo código gerado deve obedecer rigorosamente:
- **(S)ingle Responsibility:** Cada rota, handler ou componente deve fazer **apenas uma coisa**. Não crie `God Classes` ou arquivos com milhares de linhas. Separe roteadores (`index.ts`) dos manipuladores lógicos (`handler.ts`).
- **(O)pen/Closed:** O motor do sistema deve ser estendido via plugins ou middlewares, sem modificar o core.
- **(L)iskov Substitution & (I)nterface Segregation:** Contratos de Typescript devem ser modulares.
- **(D)ependency Inversion:** Injeção de dependências pesadas (como gateways de pagamento ou instâncias de banco) deve ser feita pelo contexto do Hono (`c.env`), mantendo o código agnóstico e testável.

## 3. Atomic Design Rigoroso (Frontend Dashboard)
Os componentes em `Root/Dashboard/src/components/` devem sempre obedecer ao design atômico:
- **Atoms:** Botões, Inputs, Badges, Icons. (Sem contexto de negócio).
- **Molecules:** Inputs com labels, grupos de botões, modais pequenos.
- **Organisms:** Painéis completos (ex: `DocsPanel`, `AuthPanel`), formulários complexos contendo diversas moléculas.
- **Templates:** Layout base da página com slots vazios.
- **Pages:** Páginas renderizadas no backend, injetando dados reais nos Organisms.

## 4. Matriz Tecnológica de Implementação
| Camada | Tecnologia | Regra de Implementação |
| :--- | :--- | :--- |
| **Routing / API** | Hono | Middleware `tenantAuth.ts` OBRIGATÓRIO em `/api/v1/*`. |
| **Frontend UI** | HTMX | Comunicação via atributos `hx-*`. Respostas devem ser componentes Hono/JSX puros. |
| **Frontend State**| Alpine.js | Apenas reatividade de UI (Modais, Accordions, Tabs). Eventos devem usar sintaxe segura `{...{ '@click': '...' }}` para não quebrar o compilador TSX do Hono. |
| **Database** | Cloudflare D1 | O prefixo lógico de separação de tenant é obrigatório onde aplicável. |
| **Arquitetura** | EDA | Uso intensivo de Workers / Durable Objects para processos paralelos. |