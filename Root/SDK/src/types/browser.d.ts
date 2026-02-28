/**
 * GeniusBase SDK — Browser & Node Environment Type Declarations
 * Root/SDK/src/types/browser.d.ts
 *
 * The root tsconfig.json only includes lib: ["ESNext"] (no DOM),
 * since the Engine runs on Cloudflare Workers. The SDK targets both
 * browser and Node (which has fetch/WebSocket since Node 18+).
 *
 * We declare the minimal subset of browser globals the SDK uses here,
 * so the project-level `tsc --noEmit` validates the SDK without
 * requiring a separate tsconfig or a `lib: ["DOM"]` footprint.
 */

declare function fetch(
    input: string | URL,
    init?: {
        method?: string
        headers?: Record<string, string>
        body?: string
    }
): Promise<{
    ok: boolean
    status: number
    json<T = unknown>(): Promise<T>
    text(): Promise<string>
}>

declare class URL {
    constructor(url: string, base?: string)
    href: string
    toString(): string
}

declare class WebSocket {
    static readonly CONNECTING: 0
    static readonly OPEN: 1
    static readonly CLOSING: 2
    static readonly CLOSED: 3
    readonly readyState: number
    onopen: ((event: Event) => void) | null
    onclose: ((event: CloseEvent) => void) | null
    onmessage: ((event: MessageEvent) => void) | null
    onerror: ((event: Event) => void) | null
    constructor(url: string)
    send(data: string): void
    close(code?: number, reason?: string): void
}

declare class Event {
    type: string
}
declare class CloseEvent extends Event {
    code: number
    reason: string
    wasClean: boolean
}
declare class MessageEvent extends Event {
    data: unknown
}
