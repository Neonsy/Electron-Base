import { BridgeMark } from '@/web/components/home/primitives';
import { scrollToSection } from '@/web/components/home/scroll';
import { useRuntimeInfo } from '@/web/components/home/use-runtime-info';

const sections = [
    { id: 'bridge', label: 'Bridge' },
    { id: 'setup', label: 'Make it yours' },
    { id: 'release', label: 'Ship' },
    { id: 'toolkit', label: 'Toolkit' },
    { id: 'later', label: 'Later' },
] as const;

function ConnectionStatus() {
    const runtime = useRuntimeInfo();

    const { dot, label } = runtime.isSuccess
        ? { dot: 'bg-emerald-400 shadow-[0_0_0_3px] shadow-emerald-400/15', label: 'Main process connected' }
        : runtime.isError
          ? { dot: 'bg-coral-400', label: 'Main process unreachable' }
          : { dot: 'bg-stone-600', label: 'Connecting to main' };

    return (
        <p role='status' className='ml-auto flex items-center gap-2.5 text-sm text-stone-400'>
            <span aria-hidden='true' className={`size-1.5 rounded-full ${dot}`} />
            {label}
        </p>
    );
}

export default function SiteHeader() {
    return (
        <header className='sticky top-0 z-40 border-b border-white/6 bg-ink-950'>
            <div className='mx-auto flex h-18 max-w-[96rem] items-center gap-12 px-8 xl:px-12'>
                <button
                    type='button'
                    onClick={() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className='group flex cursor-pointer items-center gap-3.5 rounded-xl focus-visible:ring-2 focus-visible:ring-renderer focus-visible:outline-none'>
                    <span className='grid size-10 place-items-center rounded-xl bg-linear-to-b from-ink-700 to-ink-850 shadow-[inset_0_1px_0_rgb(255_255_255/0.09),0_0_0_1px_rgb(255_255_255/0.07),0_10px_24px_-10px_rgb(0_0_0/0.9)] transition-transform duration-200 group-hover:scale-105'>
                        <BridgeMark className='h-3.5 w-7' />
                    </span>
                    <span className='text-lg font-semibold tracking-[-0.025em] text-stone-50'>
                        Electron <span className='font-normal text-stone-400'>Base</span>
                    </span>
                </button>

                <nav aria-label='Page sections'>
                    <ul className='flex items-center gap-1'>
                        {sections.map(({ id, label }) => (
                            <li key={id}>
                                <button
                                    type='button'
                                    onClick={() => {
                                        scrollToSection(id);
                                    }}
                                    className='cursor-pointer rounded-md px-3 py-1.5 text-base text-stone-400 transition-colors hover:bg-white/5 hover:text-stone-100 focus-visible:ring-2 focus-visible:ring-renderer focus-visible:outline-none'>
                                    {label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>

                <ConnectionStatus />
            </div>
        </header>
    );
}
