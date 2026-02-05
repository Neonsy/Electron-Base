/**
 * Root tRPC router.
 * Mounts all domain routers here; AppRouter type is exported for client inference.
 */

import { router } from '@/app/backend/trpc/init';
import { examplesRouter } from '@/app/backend/trpc/routers/examples';
import { systemRouter } from '@/app/backend/trpc/routers/system';

export const appRouter = router({
    system: systemRouter,
    // Start-page demo only. Remove with src/features/bridge-playground/.
    examples: examplesRouter,
});

export type AppRouter = typeof appRouter;
