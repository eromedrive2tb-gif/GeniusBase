---
trigger: always_on
---

# Glob: **/*

# Regras de Estrutura Atômica e Stack (Hono + HTMX + Alpine)

## 1. Proibição da Estrutura Convencional
É ESTRITAMENTE PROIBIDO criar ou sugerir a criação de arquivos em uma pasta root `src/`. A arquitetura de pastas segue um Design Atômico Rigoroso dividido em dois escopos principais:

- `Root/Engine/src/`: Contém todo o core do mini-supabase (APIs multi-tenant, Hono, Durable Objects, D1 migrations).
- `Root/Dashboard/src/`: Contém a interface do usuário administrativa (HTMX, Alpine.js, Tailwind).

## 2. Separação de Responsabilidades (Tabela de Stack)
Ao gerar código, respeite a seguinte matriz de tecnologias:

| Camada | Tecnologia | Regra de Implementação |
| :--- | :--- | :--- |
| **Routing / API** | Hono | Usar rotas aninhadas e middlewares para validação de `tenant_id`. |
| **Frontend UI** | HTMX | Interações sem page reloads. Retornar HTML parcial (fragments) do Hono. |
| **Frontend State**| Alpine.js | Apenas para reatividade leve no cliente (ex: modais, dropdowns, validação inline). |
| **Database** | Cloudflare D1 | SQL relacional para Costumers, Products, Users. |
| **Realtime / State**| Durable Objects | Gerenciamento de estado de conexões WebSockets ou locks de concorrência. |
| **Storage / Cache**| R2 / KV | R2 para arquivos estáticos/uploads. KV para tokens e cache de respostas. |

## 3. Padrão de Resposta do Agente
- Sempre que criar um arquivo, especifique o caminho completo começando com `Root/Engine/...` ou `Root/Dashboard/...`.
- Para o frontend, prefira renderização no servidor (SSR) com Hono retornando tags HTMX (`hx-get`, `hx-post`) em vez de construir SPAs com JSON.