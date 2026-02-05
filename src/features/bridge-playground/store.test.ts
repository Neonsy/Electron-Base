import { beforeEach, describe, expect, it } from 'vitest';

import {
    MAX_DOTS_IN_FLIGHT,
    MAX_LOGGED_CALLS,
    summarizeCalls,
    useBridgeCalls,
} from '@/web/features/bridge-playground/store';

describe('bridge call log', () => {
    beforeEach(() => {
        useBridgeCalls.getState().clear();
    });

    it('tracks a call from pending to its measured result', () => {
        const { start, succeed } = useBridgeCalls.getState();
        const id = start('hello');

        expect(useBridgeCalls.getState().calls).toEqual([expect.objectContaining({ id, status: 'pending' })]);

        succeed(id, 1.5, '2026-09-28T00:00:00.000Z');

        expect(useBridgeCalls.getState().calls[0]).toMatchObject({
            status: 'ok',
            roundTripMs: 1.5,
            handledAt: '2026-09-28T00:00:00.000Z',
        });
    });

    it('draws one dot per call and bounds the dots in flight', () => {
        const { startMany } = useBridgeCalls.getState();
        for (let click = 0; click < 60; click += 1) {
            startMany(Array.from({ length: 100 }, (_, index) => `call ${String(index)}`));
        }

        const drawn = useBridgeCalls.getState().pulses.reduce((sum, pulse) => sum + pulse.calls, 0);
        expect(useBridgeCalls.getState().calls).toHaveLength(MAX_LOGGED_CALLS);
        expect(drawn).toBe(MAX_DOTS_IN_FLIGHT);
    });

    it('records a burst and its results in one store update each', () => {
        let updates = 0;
        const unsubscribe = useBridgeCalls.subscribe(() => {
            updates += 1;
        });

        const { startMany, settleMany } = useBridgeCalls.getState();
        const started = startMany(Array.from({ length: 100 }, (_, index) => `burst ${String(index)}`));
        settleMany(started.map(({ id }) => ({ id, roundTripMs: 2, handledAt: 'now' })));
        unsubscribe();

        expect(updates).toBe(2);
        // One group of 100 dots, one per call.
        expect(useBridgeCalls.getState().pulses).toEqual([expect.objectContaining({ calls: 100 })]);
        expect(useBridgeCalls.getState().totals).toEqual({ sent: 100, returned: 100, failed: 0 });
    });

    it('keeps lifetime totals after old calls leave the bounded log', () => {
        const { startMany, settleMany } = useBridgeCalls.getState();
        const started = startMany(
            Array.from({ length: MAX_LOGGED_CALLS + 250 }, (_, index) => `call ${String(index)}`)
        );
        settleMany(started.map(({ id }) => ({ id, roundTripMs: 1, handledAt: 'now' })));

        expect(useBridgeCalls.getState().calls).toHaveLength(MAX_LOGGED_CALLS);
        expect(useBridgeCalls.getState().totals.returned).toBe(MAX_LOGGED_CALLS + 250);
    });

    it('starts each click immediately and keeps start times when one finishes', () => {
        const { start, dropPulse } = useBridgeCalls.getState();
        const before = performance.now();
        for (let index = 0; index < 4; index += 1) {
            start(`call ${String(index)}`);
        }

        const pulses = useBridgeCalls.getState().pulses;
        expect(pulses).toHaveLength(4);
        expect(pulses.every((pulse) => pulse.startedAt >= before && pulse.startedAt <= performance.now())).toBe(true);

        const [first] = pulses;
        if (first) {
            dropPulse(first.id);
        }

        expect(useBridgeCalls.getState().pulses).toEqual(pulses.slice(1));
    });

    it('summarizes completed, failed, and pending calls', () => {
        const { start, succeed, fail } = useBridgeCalls.getState();
        succeed(start('a'), 1, 'now');
        succeed(start('b'), 3, 'now');
        succeed(start('c'), 2, 'now');
        fail(start('d'), 4, 'boom');
        start('e');

        expect(summarizeCalls(useBridgeCalls.getState().calls)).toEqual({
            completed: 3,
            failed: 1,
            pending: 1,
            medianMs: 2,
            lastMs: 2,
        });
    });
});
