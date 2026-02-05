/**
 * Example contract for the start page's bridge playground.
 * Delete it together with `electron/backend/trpc/routers/examples/` and `src/features/bridge-playground/`.
 *
 * One ArkType schema validates the renderer form and the main-process procedure, so both sides
 * agree on the rules. The main process still re-validates: renderer input is never trusted.
 */

import { type } from 'arktype';

export const ECHO_MESSAGE_MAX_LENGTH = 120;

export const echoInput = type({
    '+': 'reject',
    message: type.string
        .atLeastLength(1)
        .atMostLength(ECHO_MESSAGE_MAX_LENGTH)
        .configure({ message: `Write 1 to ${String(ECHO_MESSAGE_MAX_LENGTH)} characters` }),
});

export type EchoInput = typeof echoInput.infer;
