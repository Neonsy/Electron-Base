import { type } from 'arktype';

/**
 * tRPC accepts any Standard Schema validator, so ArkType types can be passed to `.input()` directly.
 * `'+': 'reject'` refuses undeclared keys instead of silently stripping them.
 */
export const setUpdateChannelInput = type({
    '+': 'reject',
    channel: "'stable' | 'beta'",
});

export type SetUpdateChannelInput = typeof setUpdateChannelInput.infer;
