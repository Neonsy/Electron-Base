import BridgeDots from '@/web/features/bridge-playground/bridge-dots';
import { BRIDGE_GRID } from '@/web/features/bridge-playground/layout';

import type { ReactNode } from 'react';

interface SideProps {
    tone: 'renderer' | 'main';
    kicker: string;
    title: string;
    address: ReactNode;
    facts: string[];
}

function Side({ tone, kicker, title, address, facts }: SideProps) {
    const accent = tone === 'renderer' ? 'text-renderer' : 'text-main-bright';
    const border = tone === 'renderer' ? 'border-renderer/25' : 'border-main/60';
    const glow = tone === 'renderer' ? 'from-renderer/8' : 'from-main/25';

    return (
        <div className={`relative overflow-hidden rounded-2xl border ${border} bg-ink-900 p-7`}>
            <div
                aria-hidden='true'
                className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-linear-to-b ${glow} to-transparent`}
            />
            <p className={`relative font-mono text-sm tracking-[0.16em] uppercase ${accent}`}>{kicker}</p>
            <h3 className='relative mt-3 text-3xl font-semibold tracking-tight text-stone-50'>{title}</h3>
            <p className='relative mt-1.5 truncate font-mono text-base text-stone-400'>{address}</p>
            <ul className='relative mt-6 space-y-2.5'>
                {facts.map((fact) => (
                    <li key={fact} className='flex gap-3 text-base leading-7 text-stone-300'>
                        <span aria-hidden='true' className={`mt-2.5 h-px w-3 shrink-0 bg-current ${accent}`} />
                        {fact}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function Track() {
    return (
        <div className='relative flex flex-col justify-center'>
            <div aria-hidden='true' className='font-mono text-xs tracking-wide'>
                <p className='px-5 text-renderer'>request →</p>
                {/* Two lanes inset from both cards: calls leave on the renderer lane, turn around in the main
                    process, and return on the main lane. z-10 keeps the dots above the neighboring cards. */}
                <div className='relative z-10 mx-6 my-4 h-14'>
                    <div className='absolute inset-x-0 top-0 h-[3px] -translate-y-1/2 rounded-full bg-linear-to-r from-renderer/80 to-renderer/30 shadow-[0_0_12px] shadow-renderer/40' />
                    <div className='absolute inset-x-0 bottom-0 h-[3px] translate-y-1/2 rounded-full bg-linear-to-r from-main/70 to-main-bright/80 shadow-[0_0_14px] shadow-main/70' />
                    <div className='absolute inset-y-0 right-0 w-[3px] translate-x-1/2 rounded-full bg-linear-to-b from-renderer/30 to-main-bright/80' />
                    <span className='absolute top-0 left-0 size-2 -translate-1/2 rounded-full bg-renderer' />
                    <span className='absolute bottom-0 left-0 size-2 -translate-x-1/2 translate-y-1/2 rounded-full bg-main-bright' />
                    <BridgeDots />
                </div>
                <p className='px-5 text-right text-main-bright'>← result</p>
            </div>

            <div className='mx-3 mt-6 rounded-xl border border-white/15 bg-ink-850 px-2 py-4 text-center shadow-lg shadow-black/40 lg:px-4'>
                <p className='font-mono text-xs tracking-[0.16em] text-stone-400 uppercase'>Preload gate</p>
                <p className='mt-2 font-mono text-[0.8rem] whitespace-nowrap text-stone-50 lg:text-sm'>
                    trpcBridge.request()
                </p>
                <p className='mt-1.5 text-sm text-stone-400'>The only exposed function</p>
            </div>
        </div>
    );
}

export default function BridgeDiagram() {
    return (
        <div className={`${BRIDGE_GRID} items-stretch`}>
            <Side
                tone='renderer'
                kicker='Renderer'
                title='Sandboxed web page'
                address={window.location.origin}
                facts={[
                    'No Node.js or Electron APIs',
                    'Strict Content Security Policy',
                    'Navigation locked to the app origin',
                    'React, TanStack Query, and the tRPC client',
                ]}
            />
            <Track />
            <Side
                tone='main'
                kicker='Main process'
                title='Privileged Node.js'
                address='electron/backend/trpc'
                facts={[
                    'Validates every input with ArkType',
                    'Owns windows, files, and updates',
                    'Denies web permissions by default',
                    'Accepts calls only from the app’s own frame',
                ]}
            />
        </div>
    );
}
