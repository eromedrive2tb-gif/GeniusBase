---
description: Gera a estrutura atômica básica para uma nova entidade do Mini-Supabase, respeitando o EDA e o Multi-tenancy.
---

1. Identifique o nome da entidade a ser criada (ex: Costumers, Products).
2. Analise a skill `mini-supabase-architect` para entender as regras de D1 e Multi-tenancy.
3. Crie as rotas Hono dentro de `Root/Engine/src/api/v1/[entidade]`.
4. Crie o arquivo de migração SQL para o Cloudflare D1 garantindo a lógica de prefixo de tabelas por tenant.
5. Crie a interface visual de administração da entidade usando Hono JSX + HTMX + Alpine.js em `Root/Dashboard/src/views/[entidade]`.
6. Revise se a estrutura gerada não violou a regra de evitar pastas `src/` na raiz.