/** @jsxImportSource hono/jsx */

/**
 * Template: AuthLayout
 * Root/Dashboard/src/components/templates/AuthLayout.tsx
 *
 * Responsabilidade única: shell visual das páginas de autenticação.
 * Renderiza head (com dependências), body wrapper, card e footer.
 * O conteúdo do card é injetado via children.
 */

interface AuthLayoutProps {
    title: string
    description: string
    children: any
    footerLink?: {
        text: string
        label: string
        href: string
    }
}

export const AuthLayout = ({ title, description, children, footerLink }: AuthLayoutProps) => {
    return (
        <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>{title} — GeniusBase</title>
                <meta name="description" content={description} />

                {/* Dependencies */}
                <script src="https://unpkg.com/htmx.org@1.9.10"></script>
                <script defer src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js"></script>

                {/* HTMX: Allow swapping error responses (4xx/5xx) into the DOM */}
                <script dangerouslySetInnerHTML={{
                    __html: `
                  document.addEventListener('htmx:beforeSwap', function(evt) {
                    if (evt.detail.xhr.status >= 400) {
                      evt.detail.shouldSwap = true;
                      evt.detail.isError = false;
                    }
                  });
                ` }}></script>

                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

                {/* Styles */}
                <link rel="stylesheet" href="/styles/auth.css" />
            </head>

            <body>
                <div class="auth-wrapper">
                    <div class="auth-card" x-data="{ loading: false, showPassword: false }">
                        {/* Header */}
                        <div class="auth-header">
                            <h1>GeniusBase</h1>
                            <p>{description}</p>
                        </div>

                        {/* Content (form injected via children) */}
                        {children}
                    </div>

                    {/* Footer with navigation link */}
                    <div class="auth-footer">
                        {footerLink ? (
                            <span>
                                {footerLink.text}{' '}
                                <a href={footerLink.href}>{footerLink.label}</a>
                            </span>
                        ) : (
                            <span>Powered by GeniusBase Engine</span>
                        )}
                    </div>
                </div>
            </body>
        </html>
    )
}
