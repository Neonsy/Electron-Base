import Hero from '@/web/components/home/hero';
import LaterSection from '@/web/components/home/later-section';
import ReleaseSection from '@/web/components/home/release-section';
import SetupSection from '@/web/components/home/setup-section';
import SiteHeader from '@/web/components/home/site-header';
import ToolkitSection from '@/web/components/home/toolkit-section';
import BridgeSection from '@/web/features/bridge-playground/bridge-section';

export default function HomePage() {
    return (
        <div className='min-h-screen bg-ink-950 font-sans text-stone-100'>
            <a
                href='#main-content'
                onClick={(event) => {
                    // Hash routing owns the fragment; move focus without navigating.
                    event.preventDefault();
                    document.getElementById('main-content')?.focus();
                }}
                className='fixed top-3 left-3 z-50 -translate-y-20 rounded-md bg-stone-50 px-4 py-2 text-base font-semibold text-ink-950 transition-transform focus:translate-y-0 focus:outline-none'>
                Skip to content
            </a>

            <SiteHeader />

            <main id='main-content' tabIndex={-1} className='outline-none'>
                <Hero />
                <BridgeSection />
                <div className='border-t border-white/6'>
                    <SetupSection />
                </div>
                <div className='border-t border-white/6 bg-ink-900/40'>
                    <ReleaseSection />
                </div>
                <div className='border-t border-white/6'>
                    <ToolkitSection />
                </div>
                <div className='border-t border-white/6'>
                    <LaterSection />
                </div>
            </main>

            <footer className='border-t border-white/6'>
                <div className='mx-auto flex max-w-[96rem] flex-wrap items-center gap-4 px-8 py-10 text-base text-stone-500 xl:px-12'>
                    <p>
                        Replace this page in{' '}
                        <code className='font-mono text-sm text-stone-300'>src/pages/index.tsx</code>
                    </p>
                </div>
            </footer>
        </div>
    );
}
