import { LuArrowDown } from 'react-icons/lu';

import { scrollToSection } from '@/web/components/home/scroll';
import { useRuntimeInfo } from '@/web/components/home/use-runtime-info';

const PLATFORM_NAMES: Record<string, string> = {
    darwin: 'macOS',
    linux: 'Linux',
    win32: 'Windows',
};

function RuntimeReadout() {
    const runtime = useRuntimeInfo();
    const info = runtime.data;

    const rows = [
        { label: 'Electron', value: info?.versions.electron, tone: 'text-stone-100' },
        { label: 'Chromium', value: info?.versions.chrome, tone: 'text-renderer' },
        { label: 'Node.js', value: info?.versions.node, tone: 'text-main-bright' },
        { label: 'V8', value: info?.versions.v8, tone: 'text-stone-300' },
        {
            label: 'Platform',
            value: info ? `${PLATFORM_NAMES[info.platform] ?? info.platform} · ${info.arch}` : undefined,
            tone: 'text-stone-300',
        },
        {
            label: 'Build',
            value: info ? `${info.isPackaged ? 'Packaged' : 'Unpackaged'} · v${info.appVersion}` : undefined,
            tone: 'text-stone-300',
        },
    ];

    return (
        <aside
            aria-labelledby='runtime-title'
            aria-busy={runtime.isPending}
            className='relative rounded-2xl border border-white/8 bg-ink-900 p-6 shadow-2xl shadow-black/40'>
            <div className='flex items-baseline justify-between gap-4'>
                <h2 id='runtime-title' className='text-base font-medium text-stone-200'>
                    Running now
                </h2>
                <p className='font-mono text-sm text-stone-400'>system.getRuntimeInfo</p>
            </div>

            {runtime.isError ? (
                <p role='alert' className='mt-6 text-base leading-7 text-coral-400'>
                    Couldn&apos;t reach the main process. Check that the window loaded the preload script
                </p>
            ) : (
                <dl className='mt-5 divide-y divide-white/6'>
                    {rows.map(({ label, value, tone }) => (
                        <div key={label} className='flex items-baseline justify-between gap-6 py-2.5'>
                            <dt className='text-base text-stone-500'>{label}</dt>
                            <dd className={`truncate font-mono text-base tabular-nums ${tone}`}>
                                {value ?? <span className='text-stone-700'>···</span>}
                            </dd>
                        </div>
                    ))}
                </dl>
            )}

            <p className='mt-4 text-sm leading-6 text-stone-400'>Read live over the typed bridge</p>
        </aside>
    );
}

export default function Hero() {
    return (
        <section aria-labelledby='hero-title' className='relative isolate overflow-hidden border-b border-white/6'>
            <div
                aria-hidden='true'
                className='pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_32rem_at_12%_-10%,--alpha(var(--color-renderer)/13%),transparent_65%),radial-gradient(48rem_30rem_at_95%_110%,--alpha(var(--color-main)/28%),transparent_65%)]'
            />
            <div
                aria-hidden='true'
                className='pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,--alpha(var(--color-white)/5%)_1px,transparent_1px)] mask-[linear-gradient(to_bottom,black,transparent_85%)] bg-size-[6rem_100%]'
            />

            <div className='mx-auto grid max-w-[96rem] items-end gap-12 px-8 pt-24 pb-20 md:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem] xl:gap-16 xl:px-12 2xl:pt-36'>
                <div>
                    <h1
                        id='hero-title'
                        className='max-w-5xl text-6xl leading-[0.95] font-semibold tracking-[-0.055em] text-balance text-stone-50 xl:text-[5.5rem] 2xl:text-8xl'>
                        Neonsy&apos;s Electron{' '}
                        <span className='bg-linear-to-r from-renderer via-stone-100 to-main-bright bg-clip-text text-transparent'>
                            Starter Template
                        </span>
                    </h1>
                    <p className='mt-8 max-w-xl text-xl leading-8 text-pretty text-stone-400'>
                        A secure desktop foundation: A sandboxed React renderer, one typed bridge, and a main process
                        that owns everything privileged. Tests, updates, and signed releases are already wired
                    </p>
                    <div className='mt-10 flex flex-wrap items-center gap-3'>
                        <button
                            type='button'
                            onClick={() => {
                                scrollToSection('bridge');
                            }}
                            className='inline-flex cursor-pointer items-center gap-2.5 rounded-full bg-stone-50 px-5 py-2.5 text-base font-semibold text-ink-950 transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-renderer focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 focus-visible:outline-none'>
                            Try the bridge
                            <LuArrowDown className='size-4' aria-hidden='true' />
                        </button>
                        <button
                            type='button'
                            onClick={() => {
                                scrollToSection('setup');
                            }}
                            className='cursor-pointer rounded-full px-5 py-2.5 text-base font-medium text-stone-300 ring-1 ring-white/12 transition-colors ring-inset hover:bg-white/5 hover:text-stone-50 focus-visible:ring-2 focus-visible:ring-renderer focus-visible:outline-none'>
                            Make it yours
                        </button>
                    </div>
                </div>

                <RuntimeReadout />
            </div>
        </section>
    );
}
