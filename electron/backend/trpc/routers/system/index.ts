/**
 * System router for application-level operations.
 * Handles window management, runtime facts, and update preferences.
 */

import { publicProcedure, router } from '@/app/backend/trpc/init';
import { getRuntimeInfo } from '@/app/backend/trpc/routers/system/runtimeInfo';
import { signalReady } from '@/app/backend/trpc/routers/system/signalReady';
import { setUpdateChannelInput } from '@/app/backend/trpc/routers/system/updateChannelInput';
import { getUpdateChannel, setUpdateChannel } from '@/app/main/updates/updater';

export const systemRouter = router({
    getRuntimeInfo: publicProcedure.query(() => getRuntimeInfo()),

    getUpdateChannel: publicProcedure.query(async () => ({ channel: await getUpdateChannel() })),

    setUpdateChannel: publicProcedure
        .input(setUpdateChannelInput)
        .mutation(async ({ input }) => ({ channel: await setUpdateChannel(input.channel) })),

    // Called by renderer when React has rendered, to show the window
    signalReady: publicProcedure.mutation(({ ctx }) => signalReady(ctx.win)),
});
