import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

import { formatMs } from '@/web/features/bridge-playground/format';
import { useBridgeCalls, type BridgeCall } from '@/web/features/bridge-playground/store';

const ROW_HEIGHT = 44;
// Keep in sync: the header reserves the width of the 10px scrollbar styled in index.css.
const COLUMNS =
    'grid-cols-[minmax(0,1fr)_5.5rem] lg:grid-cols-[3.5rem_minmax(0,1fr)_5.5rem] xl:grid-cols-[3.5rem_minmax(0,1fr)_5.5rem_6.5rem]';

function CallRow({ call }: { call: BridgeCall }) {
    const statusTone =
        call.status === 'ok' ? 'bg-emerald-400' : call.status === 'error' ? 'bg-coral-400' : 'bg-stone-500';
    const statusLabel = call.status === 'ok' ? 'Returned' : call.status === 'error' ? 'Failed' : 'In flight';

    return (
        <div className={`grid h-full ${COLUMNS} items-center gap-4 border-b border-white/5 px-5 text-base`}>
            <span className='hidden font-mono text-sm text-stone-400 tabular-nums lg:block'>#{call.id}</span>
            <span className='flex min-w-0 items-center gap-2.5'>
                <span aria-hidden='true' className={`size-1.5 shrink-0 rounded-full ${statusTone}`} />
                <span className='sr-only'>{statusLabel}: </span>
                <span className='truncate text-stone-200' title={call.error ?? call.message}>
                    {call.error ?? call.message}
                </span>
            </span>
            <span className='text-right font-mono text-sm text-stone-300 tabular-nums'>
                {formatMs(call.roundTripMs)}
            </span>
            <span className='hidden text-right font-mono text-sm text-stone-400 tabular-nums xl:block'>
                {call.handledAt ? new Date(call.handledAt).toLocaleTimeString() : '–'}
            </span>
        </div>
    );
}

export default function CallLog() {
    const calls = useBridgeCalls((state) => state.calls);
    const clear = useBridgeCalls((state) => state.clear);
    const sent = useBridgeCalls((state) => state.totals.sent);
    const scrollRef = useRef<HTMLDivElement>(null);

    // TanStack Virtual returns fresh measurement functions each render, so the React Compiler
    // skips memoizing this component. That is the documented, expected behavior.
    // eslint-disable-next-line react-hooks/incompatible-library
    const virtualizer = useVirtualizer({
        count: calls.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 10,
    });

    return (
        <div className='flex min-h-0 flex-col overflow-hidden rounded-2xl border border-main/35 bg-ink-900'>
            <div className='flex items-center justify-between gap-4 border-b border-white/8 px-5 py-3.5'>
                <h3 className='text-base font-medium text-stone-200'>
                    Call log{' '}
                    <span className='ml-1 font-mono text-sm font-normal text-stone-400 tabular-nums'>
                        {sent > calls.length
                            ? `latest ${calls.length.toLocaleString()} of ${sent.toLocaleString()}`
                            : calls.length.toLocaleString()}
                    </span>
                </h3>
                <button
                    type='button'
                    onClick={clear}
                    disabled={calls.length === 0}
                    className='cursor-pointer rounded-md px-2.5 py-1 text-sm text-stone-400 transition-colors hover:bg-white/5 hover:text-stone-100 focus-visible:ring-2 focus-visible:ring-renderer focus-visible:outline-none disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent'>
                    Clear
                </button>
            </div>

            <div
                aria-hidden='true'
                className={`grid ${COLUMNS} gap-4 border-b border-white/5 py-2 pr-[calc(1.25rem+10px)] pl-5 text-sm text-stone-400`}>
                <span className='hidden lg:block'>Call</span>
                <span>Message</span>
                <span className='text-right'>Round trip</span>
                <span className='hidden text-right xl:block'>Handled</span>
            </div>

            <div
                ref={scrollRef}
                role='log'
                aria-label='Bridge calls, newest first'
                className='relative h-60 overflow-y-scroll overscroll-contain xl:h-72'>
                {calls.length === 0 ? (
                    <div className='grid h-full place-items-center px-8 text-center'>
                        <div>
                            <p className='text-base text-stone-200'>No calls yet</p>
                            <p className='mt-1.5 max-w-xs text-sm leading-6 text-stone-400'>
                                Send one, or fire a burst to watch tRPC batch 100 calls into a single IPC message
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className='relative w-full' style={{ height: `${String(virtualizer.getTotalSize())}px` }}>
                        {virtualizer.getVirtualItems().map((item) => {
                            // Newest first: virtual row 0 is the last call.
                            const call = calls[calls.length - 1 - item.index];
                            if (!call) {
                                return null;
                            }

                            return (
                                <div
                                    key={call.id}
                                    className='absolute inset-x-0 top-0'
                                    style={{
                                        height: `${String(item.size)}px`,
                                        transform: `translateY(${String(item.start)}px)`,
                                    }}>
                                    <CallRow call={call} />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
