/**
 * Example procedures used by the start page's bridge playground.
 * Delete this router, its mount in `router.ts`, `electron/shared/examples/`, and
 * `src/features/bridge-playground/` when you replace the start page.
 */

import { publicProcedure, router } from '@/app/backend/trpc/init';
import { echoInput } from '@/app/shared/examples/echoInput';

export const examplesRouter = router({
    echo: publicProcedure.input(echoInput).mutation(({ input, ctx }) => ({
        message: input.message,
        characters: input.message.length,
        windowId: ctx.win?.id ?? null,
        handledAt: new Date().toISOString(),
    })),
});
