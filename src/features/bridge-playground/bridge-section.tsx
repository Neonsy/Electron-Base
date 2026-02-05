/**
 * Start-page demo of the renderer-to-main bridge. Delete this folder, `electron/shared/examples/`,
 * and `electron/backend/trpc/routers/examples/` when you replace the start page.
 */

import { useForm } from '@tanstack/react-form';
import { LuSend, LuZap } from 'react-icons/lu';

import { Section } from '@/web/components/home/primitives';
import BridgeDiagram from '@/web/features/bridge-playground/bridge-diagram';
import CallLog from '@/web/features/bridge-playground/call-log';
import { formatMs } from '@/web/features/bridge-playground/format';
import { BRIDGE_GRID } from '@/web/features/bridge-playground/layout';
import { summarizeCalls, useBridgeCalls, type BridgeCallResult } from '@/web/features/bridge-playground/store';
import { useTRPCClient } from '@/web/lib/trpc';

import { ECHO_MESSAGE_MAX_LENGTH, echoInput } from '@/app/shared/examples/echoInput';

const BURST_SIZE = 100;

function toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'The call failed.';
}

/**
 * Sends calls with the vanilla tRPC client rather than useMutation: a burst would otherwise create
 * one TanStack Query mutation per call. Calls made together still share one batched IPC message.
 */
function useSendCalls() {
    const client = useTRPCClient();

    return async function sendCalls(messages: readonly string[]): Promise<void> {
        const { startMany, settleMany } = useBridgeCalls.getState();
        const started = startMany(messages);
        const startedAt = performance.now();

        const results = await Promise.all(
            started.map(({ id, message }) =>
                client.examples.echo.mutate({ message }).then(
                    (result): BridgeCallResult => ({
                        id,
                        roundTripMs: performance.now() - startedAt,
                        handledAt: result.handledAt,
                    }),
                    (error: unknown): BridgeCallResult => ({
                        id,
                        roundTripMs: performance.now() - startedAt,
                        error: toErrorMessage(error),
                    })
                )
            )
        );

        settleMany(results);
    };
}

function Stats() {
    const calls = useBridgeCalls((state) => state.calls);
    const totals = useBridgeCalls((state) => state.totals);
    const { medianMs } = summarizeCalls(calls);

    const items = [
        { label: 'Returned', value: totals.returned.toLocaleString() },
        { label: 'Median round trip', value: formatMs(medianMs) },
        { label: 'Failed', value: totals.failed.toLocaleString() },
    ];

    return (
        <dl className='grid grid-cols-3 divide-x divide-white/8 self-start rounded-2xl border border-white/8 bg-ink-900 md:mx-3 md:grid-cols-1 md:divide-x-0 md:divide-y'>
            {items.map(({ label, value }) => (
                <div key={label} className='px-5 py-4 md:text-center'>
                    <dt className='text-sm text-stone-400'>{label}</dt>
                    <dd className='mt-1.5 font-mono text-2xl text-stone-50 tabular-nums'>{value}</dd>
                </div>
            ))}
        </dl>
    );
}

function CallForm() {
    const sendCalls = useSendCalls();

    const form = useForm({
        defaultValues: { message: 'Hello from the renderer' },
        validators: { onChange: echoInput },
        // Hand the call off without awaiting it. TanStack Form treats an awaited submit as in progress,
        // which disables the button and drops rapid clicks while the IPC round trip runs.
        onSubmit: ({ value }) => {
            void sendCalls([value.message]);
        },
    });

    return (
        <form
            noValidate
            onSubmit={(event) => {
                event.preventDefault();
                void form.handleSubmit();
            }}
            className='flex flex-col rounded-2xl border border-renderer/15 bg-ink-900 p-6'>
            <form.Field name='message'>
                {(field) => {
                    const error = field.state.meta.errors[0]?.message;
                    const length = field.state.value.length;

                    return (
                        <div>
                            <div className='flex items-baseline justify-between gap-4'>
                                <label htmlFor={field.name} className='text-base font-medium text-stone-200'>
                                    Message for the main process
                                </label>
                                <span
                                    className={`font-mono text-sm tabular-nums ${length > ECHO_MESSAGE_MAX_LENGTH ? 'text-coral-400' : 'text-stone-500'}`}>
                                    {length}/{ECHO_MESSAGE_MAX_LENGTH}
                                </span>
                            </div>
                            <input
                                id={field.name}
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(event) => {
                                    field.handleChange(event.target.value);
                                }}
                                aria-invalid={Boolean(error)}
                                aria-describedby='message-help'
                                autoComplete='off'
                                className='mt-3 block w-full rounded-lg border border-white/10 bg-ink-950 px-3.5 py-2.5 text-base text-stone-100 placeholder:text-stone-600 focus:border-renderer/60 focus:ring-2 focus:ring-renderer/25 aria-invalid:border-coral-400/70'
                            />
                            <p
                                id='message-help'
                                className={`mt-2 min-h-5 text-sm leading-6 ${error ? 'text-coral-400' : 'text-stone-400'}`}>
                                {error ?? 'The same ArkType schema validates here and again in the main process'}
                            </p>
                        </div>
                    );
                }}
            </form.Field>

            <div className='mt-4 flex flex-wrap gap-3'>
                <form.Subscribe selector={(state) => state.isValid}>
                    {(isValid) => (
                        <button
                            type='submit'
                            disabled={!isValid}
                            className='inline-flex cursor-pointer items-center gap-2 rounded-full bg-stone-50 px-4.5 py-2 text-base font-semibold text-ink-950 transition-[background-color,scale] duration-100 select-none hover:bg-white focus-visible:ring-2 focus-visible:ring-renderer focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900 focus-visible:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100'>
                            <LuSend className='size-4' aria-hidden='true' />
                            Send call
                        </button>
                    )}
                </form.Subscribe>
                <button
                    type='button'
                    onClick={() => {
                        void sendCalls(
                            Array.from(
                                { length: BURST_SIZE },
                                (_, index) => `Burst ${String(index + 1)}/${String(BURST_SIZE)}`
                            )
                        );
                    }}
                    className='inline-flex cursor-pointer items-center gap-2 rounded-full px-4.5 py-2 text-base font-medium text-stone-200 ring-1 ring-white/12 transition-[background-color,color,scale] duration-100 select-none ring-inset hover:bg-white/5 hover:text-stone-50 focus-visible:ring-2 focus-visible:ring-renderer focus-visible:outline-none active:scale-95'>
                    <LuZap className='size-4 text-main-bright' aria-hidden='true' />
                    Burst ×{BURST_SIZE}
                </button>
            </div>
            <p className='mt-auto pt-4 text-sm leading-6 text-stone-400'>
                A burst fires {BURST_SIZE} calls at once. tRPC&apos;s batch link sends them to the main process as a
                single IPC message
            </p>
        </form>
    );
}

export default function BridgeSection() {
    return (
        <Section
            id='bridge'
            eyebrow='Architecture'
            title='One narrow bridge'
            description='The renderer is a sandboxed web page. Everything privileged lives in the main process. The only way across is a typed tRPC call through a single preload function. Send one and watch it travel'>
            <BridgeDiagram />

            {/* The same three columns as the diagram: send from the renderer side, measure on the bridge,
                and read results on the main-process side. */}
            <div className={`${BRIDGE_GRID} mt-4 items-stretch`}>
                <CallForm />
                <Stats />
                <CallLog />
            </div>
        </Section>
    );
}
