import { useEffect, useId, useState } from 'react';
import { LuCheck, LuCopy } from 'react-icons/lu';

import type { ReactNode } from 'react';

export function BridgeMark({ className = '' }: { className?: string }) {
    const gradientId = useId();

    return (
        <svg viewBox='0 0 32 16' fill='none' aria-hidden='true' className={className}>
            <defs>
                <linearGradient id={gradientId} x1='0' x2='1' y1='0' y2='0'>
                    <stop offset='0' style={{ stopColor: 'var(--color-renderer)' }} />
                    <stop offset='1' style={{ stopColor: 'var(--color-main-bright)' }} />
                </linearGradient>
            </defs>
            <line x1='6' y1='8' x2='26' y2='8' stroke={`url(#${gradientId})`} strokeWidth='2' strokeLinecap='round' />
            <circle cx='6' cy='8' r='6' className='fill-renderer' opacity='0.2' />
            <circle cx='6' cy='8' r='3.25' className='fill-renderer' />
            <circle cx='26' cy='8' r='6' className='fill-main' opacity='0.55' />
            <circle cx='26' cy='8' r='3.25' className='fill-main-bright' />
        </svg>
    );
}

interface SectionProps {
    id: string;
    eyebrow: string;
    title: string;
    description: ReactNode;
    children: ReactNode;
    aside?: ReactNode;
}

export function Section({ id, eyebrow, title, description, children, aside }: SectionProps) {
    const titleId = `${id}-title`;

    return (
        <section
            id={id}
            aria-labelledby={titleId}
            tabIndex={-1}
            className='mx-auto max-w-[96rem] scroll-mt-20 px-8 py-24 outline-none xl:px-12'>
            <div className='grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_auto]'>
                <div className='max-w-3xl'>
                    <p className='font-mono text-sm tracking-[0.18em] text-stone-500 uppercase'>{eyebrow}</p>
                    <h2
                        id={titleId}
                        className='mt-4 text-5xl font-semibold tracking-[-0.035em] text-balance text-stone-50 xl:text-6xl'>
                        {title}
                    </h2>
                    <p className='mt-5 max-w-3xl text-lg leading-8 text-pretty text-stone-400 xl:text-xl xl:leading-9'>
                        {description}
                    </p>
                </div>
                {aside}
            </div>
            <div className='mt-14'>{children}</div>
        </section>
    );
}

type CopyState = 'idle' | 'copied' | 'failed';

export function CopyCommand({ command, label }: { command: string; label: string }) {
    const [state, setState] = useState<CopyState>('idle');

    useEffect(() => {
        if (state === 'idle') {
            return;
        }

        const timer = setTimeout(() => {
            setState('idle');
        }, 1600);

        return () => {
            clearTimeout(timer);
        };
    }, [state]);

    return (
        <div className='group flex min-w-0 items-center gap-3 rounded-lg border border-white/8 bg-ink-900 py-1.5 pr-1.5 pl-4'>
            <span aria-hidden='true' className='font-mono text-base text-stone-600 select-none'>
                $
            </span>
            <code className='min-w-0 flex-1 truncate font-mono text-sm text-stone-200'>{command}</code>
            <button
                type='button'
                onClick={() => {
                    navigator.clipboard.writeText(command).then(
                        () => {
                            setState('copied');
                        },
                        () => {
                            setState('failed');
                        }
                    );
                }}
                aria-label={`Copy ${label}`}
                className='grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-stone-500 transition-colors hover:bg-white/6 hover:text-stone-100 focus-visible:ring-2 focus-visible:ring-renderer focus-visible:outline-none'>
                {state === 'copied' ? (
                    <LuCheck className='size-4 text-renderer' aria-hidden='true' />
                ) : (
                    <LuCopy className='size-4' aria-hidden='true' />
                )}
            </button>
            <span className='sr-only' role='status'>
                {state === 'copied' ? `${label} copied` : state === 'failed' ? `Couldn't copy ${label}` : ''}
            </span>
        </div>
    );
}
