# GeniusBase SDK — Playground

Ambiente de teste de integração de ponta a ponta do `@geniusbase/sdk` contra o backend local.

## Pré-requisitos

- Bun instalado
- Worker rodando localmente (ver passo 1)
- Service API Key gerada (ver passo 2)

---

## Passo 1 — Subir o backend

Na **raiz do projeto** (`GeniusBase/`), execute:

```bash
bun run dev
# equivalente a: wrangler dev
```

O Worker ficará disponível em `http://localhost:8787`.

---

## Passo 2 — Gerar a Service API Key

1. Acesse o Dashboard em [http://localhost:8787/dashboard](http://localhost:8787/dashboard)
2. Faça login com a conta de Tenant Owner
3. Na aba **"APIs Principais"**, clique em **"⚡ Gerar Service API Key"**
4. Copie o token exibido (começa com `eyJ...`) — ele aparece **apenas uma vez**

---

## Passo 3 — Colar a chave no Playground

Abra `Root/Playground/index.html` e substitua na linha indicada:

```javascript
const SERVICE_API_KEY = 'COLE_A_SUA_SERVICE_API_KEY_AQUI'
//                       ↑ cole aqui o token gerado no passo 2
```

---

## Passo 4 — Servir o Playground

O Playground usa `import { createClient } from '../SDK/dist/index.js'` — um ES Module nativo.  
Browsers bloqueiam imports de módulos em `file://`. É necessário servir via HTTP:

```bash
# Opção A — bunx serve (recomendado, sem instalação)
bunx serve Root/Playground

# Opção B — Python (se disponível)
python3 -m http.server 3000 --directory Root/Playground

# Opção C — VS Code Live Server
# Clique com botão direito em index.html → "Open with Live Server"
```

> ⚠️ **Atenção ao CORS:** O `wrangler dev` por padrão aceita requisições de qualquer origem em desenvolvimento. Se um erro de CORS aparecer, verifique se o Worker está rodando na porta correta (`8787`).

Acesse: **[http://localhost:3000](http://localhost:3000)**

---

## Passo 5 — Testar

Com o backend rodando e a chave configurada:

| Botão | O que acontece |
|-------|----------------|
| **⚡ 1. Criar Produto Falso** | `gb.from('products').insert({...})` → POST `/api/v1/products` → produto criado no D1 |
| **📋 2. Listar Produtos** | `gb.from('products').select()` → GET `/api/v1/products` → lista retornada |
| **WebSocket** | Ao clicar em "Criar Produto Falso", o evento `PRODUCT_CREATED` deve aparecer no log em **tempo real** (se outro Tenant estiver com o Dashboard aberto, ele verá também) |

---

## Estrutura de Importação

```
Root/
├── Playground/
│   └── index.html          ← você está aqui
└── SDK/
    └── dist/
        └── index.js        ← ../SDK/dist/index.js ✅ (caminho correto)
```

> O SDK deve ser compilado antes de testar. Se não existir o `dist/`, execute dentro de `Root/SDK/`:
> ```bash
> bun run build
> ```
