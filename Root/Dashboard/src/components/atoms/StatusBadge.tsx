/** @jsxImportSource hono/jsx */

/**
 * Atom: StatusBadge
 * Root/Dashboard/src/components/atoms/StatusBadge.tsx
 */

interface StatusBadgeProps {
    status: string;
    isAlpine?: boolean;
}

export const StatusBadge = ({ status, isAlpine = false }: StatusBadgeProps) => {
    if (isAlpine) {
        return (
            <span
                x-text={status}
                {...{
                    ':style': `(${status} === 'PAID' || ${status} === 'COMPLETED')
            ? 'background:rgba(34,197,94,0.15);color:#4ade80;border:1px solid rgba(34,197,94,0.3);'
            : (${status} === 'CANCELED' || ${status} === 'FAILED')
              ? 'background:rgba(239,68,68,0.12);color:#f87171;border:1px solid rgba(239,68,68,0.25);'
              : 'background:rgba(251,191,36,0.12);color:#fbbf24;border:1px solid rgba(251,191,36,0.25);'`
                }}
                style="font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; padding:0.2rem 0.55rem; border-radius:20px; display:inline-block; transition:all 0.4s;"
            ></span>
        );
    }

    const isPaid = status === 'PAID' || status === 'COMPLETED';
    const isCanceled = status === 'CANCELED' || status === 'FAILED';
    let styles = 'background:rgba(251,191,36,0.12);color:#fbbf24;border:1px solid rgba(251,191,36,0.25);';
    if (isPaid) styles = 'background:rgba(34,197,94,0.15);color:#4ade80;border:1px solid rgba(34,197,94,0.3);';
    else if (isCanceled) styles = 'background:rgba(239,68,68,0.12);color:#f87171;border:1px solid rgba(239,68,68,0.25);';

    return (
        <span
            style={`font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; padding:0.2rem 0.55rem; border-radius:20px; display:inline-block; transition:all 0.4s; ${styles}`}
        >
            {status}
        </span>
    );
};
