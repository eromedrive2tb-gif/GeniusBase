/**
 * Module declarations for non-TS assets.
 * Root/Engine/src/types/modules.d.ts
 */

// CSS files imported as text strings (via wrangler [[rules]] type = "Text")
declare module '*.css' {
    const content: string
    export default content
}

// Dashboard client-side JS scripts imported as text strings (via wrangler [[rules]] type = "Text")
declare module '*.js' {
    const content: string
    export default content
}
