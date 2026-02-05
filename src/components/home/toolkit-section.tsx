import { Section } from '@/web/components/home/primitives';

type Runtime = 'renderer' | 'main' | 'both' | 'build';

interface ToolEntry {
    name: string;
    runs: Runtime;
    packages: string;
    detail: string;
}

const RUNTIME_LABELS: Record<Runtime, string> = {
    renderer: 'Renderer',
    main: 'Main process',
    both: 'Both sides',
    build: 'Build time',
};

const RUNTIME_MARKERS: Record<Runtime, string> = {
    renderer: 'bg-renderer',
    main: 'bg-main-bright',
    both: 'bg-linear-to-r from-renderer from-50% to-main-bright to-50%',
    build: 'border border-stone-400',
};

function RuntimeMarker({ runs }: { runs: Runtime }) {
    return <span aria-hidden='true' className={`inline-block size-2 shrink-0 rounded-full ${RUNTIME_MARKERS[runs]}`} />;
}

function Legend() {
    return (
        <ul aria-label='Where each tool runs' className='flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-400'>
            {(Object.keys(RUNTIME_LABELS) as Runtime[]).map((runs) => (
                <li key={runs} className='flex items-center gap-2'>
                    <RuntimeMarker runs={runs} />
                    {RUNTIME_LABELS[runs]}
                </li>
            ))}
        </ul>
    );
}

const groups: { title: string; description: string; entries: ToolEntry[] }[] = [
    {
        title: 'Application foundation',
        description: 'Running in this window right now',
        entries: [
            {
                name: 'Window and interface',
                runs: 'both',
                packages: 'Electron 44 · React 19 · Tailwind CSS 4',
                detail: 'Sandboxed renderer with the React Compiler enabled',
            },
            {
                name: 'Routes and server state',
                runs: 'both',
                packages: 'TanStack Router · Query · tRPC 11',
                detail: 'Hash routing and typed calls over one IPC channel',
            },
            {
                name: 'Runtime boundary',
                runs: 'main',
                packages: 'app:// protocol · CSP · Electron fuses',
                detail: 'No Node in the renderer. Navigation and permissions locked down',
            },
            {
                name: 'Logs and updates',
                runs: 'main',
                packages: 'evlog · electron-updater',
                detail: 'Local structured logs and a stable or beta update channel',
            },
        ],
    },
    {
        title: 'Ready for product code',
        description: 'Each one powers part of the bridge playground above',
        entries: [
            {
                name: 'Forms and long lists',
                runs: 'renderer',
                packages: 'TanStack Form · Virtual',
                detail: 'The playground form and its virtualized call log',
            },
            {
                name: 'Client state',
                runs: 'renderer',
                packages: 'Zustand · Mutative',
                detail: 'The call-log store, updated with draft-style mutations',
            },
            {
                name: 'Runtime contracts',
                runs: 'both',
                packages: 'ArkType · neverthrow',
                detail: 'One schema for the form and the procedure. Explicit failure paths at startup',
            },
            {
                name: 'Local relational data',
                runs: 'main',
                packages: 'node:sqlite · Drizzle ORM 1.0 RC',
                detail: 'An inert, migration-ready SQLite scaffold. Nothing is created at startup',
            },
        ],
    },
    {
        title: 'Development and delivery',
        description: 'Build, verify, package, and stay current',
        entries: [
            {
                name: 'Build',
                runs: 'build',
                packages: 'TypeScript 6 · Vite 8 · pnpm 12',
                detail: 'Separate renderer, main, and preload bundles',
            },
            {
                name: 'Code quality',
                runs: 'build',
                packages: 'ESLint · Prettier · Tailwind sorting',
                detail: 'Type-aware React, security, import, and formatting rules',
            },
            {
                name: 'Tests',
                runs: 'build',
                packages: 'Vitest 5 · Playwright',
                detail: 'Behavior tests plus an end-to-end run of the production window',
            },
            {
                name: 'Automation',
                runs: 'build',
                packages: 'GitHub Actions · Renovate · electron-builder',
                detail: 'Pull request checks, weekly dependency updates, and native release jobs',
            },
        ],
    },
];

export default function ToolkitSection() {
    return (
        <Section
            id='toolkit'
            eyebrow='Toolkit'
            title='What’s inside'
            description='Every library here is installed for a reason and used by the template. Remove what your product does not need'
            aside={<Legend />}>
            <div className='grid gap-4 md:grid-cols-3 xl:gap-6'>
                {groups.map((group, groupIndex) => (
                    <section
                        key={group.title}
                        aria-labelledby={`toolkit-group-${String(groupIndex)}`}
                        className='rounded-2xl border border-white/8 bg-ink-900/70 p-6 xl:p-7'>
                        <p className='font-mono text-sm text-stone-500 tabular-nums'>
                            {String(groupIndex + 1).padStart(2, '0')}
                        </p>
                        <h3
                            id={`toolkit-group-${String(groupIndex)}`}
                            className='mt-2 text-xl font-semibold tracking-tight text-stone-50'>
                            {group.title}
                        </h3>
                        <p className='mt-1 text-base text-stone-400'>{group.description}</p>
                        <dl className='mt-5'>
                            {group.entries.map((entry) => (
                                <div key={entry.name} className='border-t border-white/6 py-4 last:pb-0'>
                                    <dt className='flex items-center gap-2.5 text-base font-medium text-stone-100'>
                                        <RuntimeMarker runs={entry.runs} />
                                        {entry.name}
                                        <span className='sr-only'>, {RUNTIME_LABELS[entry.runs]}</span>
                                    </dt>
                                    <dd className='mt-1.5 pl-4.5 font-mono text-sm text-stone-300'>{entry.packages}</dd>
                                    <dd className='mt-1.5 pl-4.5 text-base leading-7 text-stone-400'>{entry.detail}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                ))}
            </div>
        </Section>
    );
}
