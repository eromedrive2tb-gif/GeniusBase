/** @jsxImportSource hono/jsx */

/**
 * Page: Index (Landing Page)
 * Root/Dashboard/src/pages/Index.tsx
 *
 * Responsabilidade única: Renderizar a página inicial pública (não logada),
 * servindo como ponto de entrada para marketing e conversão.
 */

export const Index = () => {
    return (
        <html lang="pt-BR">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>GeniusBase — API Aggregator</title>
                <meta name="description" content="A infraestrutura Serverless Definitiva." />

                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
                <link rel="stylesheet" href="/styles/main.css" />

                <style dangerouslySetInnerHTML={{
                    __html: `
          .landing-hero {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 80vh;
            text-align: center;
            padding: 2rem;
          }
          .landing-title {
            font-size: 3rem;
            font-weight: 800;
            margin-bottom: 1rem;
            background: linear-gradient(135deg, var(--gb-cyan), var(--gb-purple));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .landing-subtitle {
            font-size: 1.25rem;
            color: var(--gb-text-muted);
            max-width: 600px;
            margin-bottom: 2.5rem;
            line-height: 1.6;
          }
          .landing-actions {
            display: flex;
            gap: 1rem;
          }
          .btn-glow {
            background: var(--gb-bg-card);
            border: 1px solid var(--gb-cyan-border);
            color: var(--gb-cyan);
            padding: 0.75rem 1.5rem;
            border-radius: var(--gb-radius);
            font-weight: 600;
            text-decoration: none;
            transition: all 0.2s;
            box-shadow: var(--gb-cyan-glow-sm);
          }
          .btn-glow:hover {
            box-shadow: var(--gb-cyan-glow);
            transform: translateY(-2px);
          }
          .btn-secondary {
            background: transparent;
            border: 1px solid var(--gb-border);
            color: var(--gb-text);
            padding: 0.75rem 1.5rem;
            border-radius: var(--gb-radius);
            font-weight: 600;
            text-decoration: none;
            transition: all 0.2s;
          }
          .btn-secondary:hover {
            border-color: var(--gb-text-muted);
            color: var(--gb-text-bright);
          }
        `}} />
            </head>
            <body>
                <main class="landing-hero">
                    <h1 class="landing-title">GeniusBase</h1>
                    <p class="landing-subtitle">
                        O único Agregador de APIs Multi-Tenant focado em performance,
                        construído nativamente na Cloudflare edge network. Comece a integrar
                        agora mesmo.
                    </p>
                    <div class="landing-actions">
                        <a href="/login" class="btn-glow">Acessar o Painel</a>
                        <a href="/register" class="btn-secondary">Criar Conta Grátis</a>
                    </div>
                </main>
            </body>
        </html>
    )
}
