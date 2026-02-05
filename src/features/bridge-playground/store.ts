import { create } from 'zustand';
import { mutative } from 'zustand-mutative';

/** The log keeps only the newest calls, so repeated bursts cannot grow memory without bound. */
export const MAX_LOGGED_CALLS = 5000;
/**
 * Safety limit on dots drawn at once, 50 bursts. Hand clicking never reaches it, so every click is shown.
 * It only bounds scripted spam. Calls beyond it still run and count in the stats.
 */
export const MAX_DOTS_IN_FLIGHT = 5000;

export type BridgeCallStatus = 'pending' | 'ok' | 'error';

export interface BridgeCall {
    id: number;
    message: string;
    status: BridgeCallStatus;
    /** Measured in the renderer around the whole tRPC call, including IPC both ways. */
    roundTripMs: number | null;
    handledAt: string | null;
    error: string | null;
}

/** The dots for one click. Each dot is one tRPC call travelling to the main process and back. */
export interface BridgePulse {
    id: number;
    /** Number of dots, one per call. */
    calls: number;
    /** performance.now() time at which the first dot leaves. Fixed when the click happens. */
    startedAt: number;
}

/** Lifetime counts. They keep counting after old calls leave the bounded log. */
export interface BridgeTotals {
    sent: number;
    returned: number;
    failed: number;
}

export type BridgeCallResult =
    { id: number; roundTripMs: number; handledAt: string } | { id: number; roundTripMs: number; error: string };

interface BridgeCallsState {
    calls: BridgeCall[];
    pulses: BridgePulse[];
    totals: BridgeTotals;
    nextId: number;
    /**
     * Records calls sent together in one store update, with one dot per call. tRPC batches the calls
     * into a single IPC message.
     */
    startMany: (messages: readonly string[]) => { id: number; message: string }[];
    /** Applies many results in one store update. */
    settleMany: (results: readonly BridgeCallResult[]) => void;
    start: (message: string) => number;
    succeed: (id: number, roundTripMs: number, handledAt: string) => void;
    fail: (id: number, roundTripMs: number, error: string) => void;
    dropPulse: (id: number) => void;
    clear: () => void;
}

const EMPTY_TOTALS: BridgeTotals = { sent: 0, returned: 0, failed: 0 };

export const useBridgeCalls = create<BridgeCallsState>()(
    mutative((set, get) => ({
        calls: [],
        pulses: [],
        totals: { ...EMPTY_TOTALS },
        nextId: 1,

        startMany: (messages) => {
            const firstId = get().nextId;
            const started = messages.map((message, index) => ({ id: firstId + index, message }));
            const now = performance.now();

            set((draft) => {
                draft.nextId += started.length;
                draft.totals.sent += started.length;
                for (const { id, message } of started) {
                    draft.calls.push({
                        id,
                        message,
                        status: 'pending',
                        roundTripMs: null,
                        handledAt: null,
                        error: null,
                    });
                }
                if (draft.calls.length > MAX_LOGGED_CALLS) {
                    draft.calls.splice(0, draft.calls.length - MAX_LOGGED_CALLS);
                }

                const inFlight = draft.pulses.reduce((sum, pulse) => sum + pulse.calls, 0);
                const dots = Math.min(started.length, MAX_DOTS_IN_FLIGHT - inFlight);
                if (dots > 0) {
                    draft.pulses.push({ id: firstId, calls: dots, startedAt: now });
                }
            });

            return started;
        },

        settleMany: (results) => {
            const byId = new Map(results.map((result) => [result.id, result]));

            set((draft) => {
                for (const result of results) {
                    if ('error' in result) {
                        draft.totals.failed += 1;
                    } else {
                        draft.totals.returned += 1;
                    }
                }

                // Recent calls are at the end, so search backwards and stop once every result is applied.
                for (let index = draft.calls.length - 1; index >= 0 && byId.size > 0; index -= 1) {
                    const call = draft.calls[index];
                    const result = call ? byId.get(call.id) : undefined;
                    if (!call || !result) {
                        continue;
                    }

                    byId.delete(call.id);
                    call.roundTripMs = result.roundTripMs;
                    if ('error' in result) {
                        call.status = 'error';
                        call.error = result.error;
                    } else {
                        call.status = 'ok';
                        call.handledAt = result.handledAt;
                    }
                }
            });
        },

        start: (message) => get().startMany([message])[0]?.id ?? -1,

        succeed: (id, roundTripMs, handledAt) => {
            get().settleMany([{ id, roundTripMs, handledAt }]);
        },

        fail: (id, roundTripMs, error) => {
            get().settleMany([{ id, roundTripMs, error }]);
        },

        dropPulse: (id) => {
            set((draft) => {
                draft.pulses = draft.pulses.filter((pulse) => pulse.id !== id);
            });
        },

        clear: () => {
            set((draft) => {
                draft.calls = [];
                draft.pulses = [];
                draft.totals = { ...EMPTY_TOTALS };
            });
        },
    }))
);

export interface BridgeCallStats {
    completed: number;
    failed: number;
    pending: number;
    medianMs: number | null;
    lastMs: number | null;
}

export function summarizeCalls(calls: readonly BridgeCall[]): BridgeCallStats {
    const durations: number[] = [];
    let failed = 0;
    let pending = 0;
    let lastMs: number | null = null;

    for (const call of calls) {
        if (call.status === 'pending') {
            pending += 1;
        } else if (call.status === 'error') {
            failed += 1;
        } else if (call.roundTripMs !== null) {
            durations.push(call.roundTripMs);
            lastMs = call.roundTripMs;
        }
    }

    durations.sort((a, b) => a - b);
    const middle = Math.floor(durations.length / 2);
    const medianMs =
        durations.length === 0
            ? null
            : durations.length % 2 === 1
              ? (durations[middle] ?? null)
              : ((durations[middle - 1] ?? 0) + (durations[middle] ?? 0)) / 2;

    return { completed: durations.length, failed, pending, medianMs, lastMs };
}
