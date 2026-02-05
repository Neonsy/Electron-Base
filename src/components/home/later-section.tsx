import { LuArrowUpRight } from 'react-icons/lu';

import { Section } from '@/web/components/home/primitives';

const recommendations = [
    {
        need: 'Small settings and secrets',
        packages: 'electron-store · safeStorage',
        detail: 'Preferences in electron-store. Credentials stay in the main process with safeStorage',
        url: 'https://www.electronjs.org/docs/latest/api/safe-storage',
    },
    {
        need: 'Hosted collaboration',
        packages: 'Convex',
        detail: 'Typed reactive data when live shared state is part of the product',
        url: 'https://docs.convex.dev/client/react/overview',
    },
    {
        need: 'Desktop authentication',
        packages: 'Better Auth Electron',
        detail: 'System-browser PKCE for products with a Better Auth server',
        url: 'https://better-auth.com/docs/integrations/electron',
    },
    {
        need: 'Crash diagnostics',
        packages: 'Sentry Electron',
        detail: 'Add after deciding consent, redaction, retention, and source-map handling',
        url: 'https://github.com/getsentry/sentry-electron',
    },
    {
        need: 'Reactive local collections',
        packages: 'TanStack DB',
        detail: 'For normalized live queries or a real sync engine, not ordinary component state',
        url: 'https://tanstack.com/db/latest/docs/overview',
    },
    {
        need: 'Native Node addons',
        packages: '@electron/rebuild',
        detail: 'Only for ABI-bound dependencies, with tests on every target architecture',
        url: 'https://github.com/electron/rebuild',
    },
];

export default function LaterSection() {
    return (
        <Section
            id='later'
            eyebrow='Not installed'
            title='Consider later'
            description='Add one when the product owns the capability and its operational cost. Links open in your browser'>
            <ul className='grid border-t border-white/10 md:grid-cols-2 md:gap-x-12'>
                {recommendations.map((item) => (
                    <li key={item.need} className='border-b border-white/6'>
                        <a
                            href={item.url}
                            target='_blank'
                            rel='noreferrer'
                            className='group grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 rounded-lg py-6 focus-visible:ring-2 focus-visible:ring-renderer focus-visible:outline-none'>
                            <span className='text-lg font-medium text-stone-100 group-hover:text-white'>
                                {item.need}
                            </span>
                            <LuArrowUpRight
                                aria-hidden='true'
                                className='row-span-3 size-5 text-stone-600 transition-colors group-hover:text-renderer'
                            />
                            <span className='mt-1 font-mono text-sm text-stone-400'>{item.packages}</span>
                            <span className='mt-2 text-base leading-7 text-stone-400'>{item.detail}</span>
                            <span className='sr-only'> (opens in your browser)</span>
                        </a>
                    </li>
                ))}
            </ul>
            <p className='mt-8 text-base text-stone-400'>
                The README compares more options, including telemetry, embedded databases, and sync engines
            </p>
        </Section>
    );
}
