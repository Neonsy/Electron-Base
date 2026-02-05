import { type } from 'arktype';
import { describe, expect, it } from 'vitest';

import { setUpdateChannelInput } from '@/app/backend/trpc/routers/system/updateChannelInput';

describe('set update channel input', () => {
    it.each(['stable', 'beta'] as const)('accepts the exact %s channel request', (channel) => {
        expect(setUpdateChannelInput({ channel })).toEqual({ channel });
    });

    it.each([undefined, [], { channel: 'canary' }, { channel: 'stable', unexpected: true }])(
        'rejects invalid or non-exact input %#',
        (input) => {
            expect(setUpdateChannelInput(input)).toBeInstanceOf(type.errors);
        }
    );
});
