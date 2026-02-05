export function formatMs(ms: number | null): string {
    if (ms === null) {
        return '–';
    }

    return ms < 10 ? `${ms.toFixed(2)} ms` : `${ms.toFixed(0)} ms`;
}
