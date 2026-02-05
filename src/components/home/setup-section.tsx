import { CopyCommand, Section } from '@/web/components/home/primitives';

const steps = [
    {
        title: 'Name the product',
        detail: 'Replace the example repository, author, support links, app ID, product name, icons, and category. The release preflight refuses to publish until you do',
        paths: ['package.json', 'electron-builder.config.ts'],
    },
    {
        title: 'Replace this page',
        detail: 'Delete the start page and the bridge playground, keep only the libraries the product needs, and design your own main-process API',
        paths: ['src/pages/', 'src/features/bridge-playground/', 'electron/backend/'],
    },
    {
        title: 'Decide what lives locally',
        detail: 'Own the SQLite schema, migrations, backup, export, retention, and reset behavior before the first byte of user data is stored',
        paths: ['electron/main/data/'],
    },
    {
        title: 'Configure distribution',
        detail: 'Point releases at the real GitHub repository, add signing and notarization secrets, protect the release environment, and enable Renovate',
        paths: ['.github/', 'docs/RELEASING.md', 'renovate.json'],
    },
];

const commands = [
    { command: 'pnpm install', label: 'install command', purpose: 'Install from the lockfile' },
    { command: 'pnpm dev', label: 'dev command', purpose: 'Vite and Electron with hot reload' },
    { command: 'pnpm check', label: 'check command', purpose: 'Types, lint, format, tests, and build' },
    { command: 'pnpm test:e2e', label: 'E2E command', purpose: 'Launch the real production window' },
];

export default function SetupSection() {
    return (
        <Section
            id='setup'
            eyebrow='Setup'
            title='Make it yours'
            description='Four decisions turn the repository from an example into your application. Work through them in order'>
            <div className='grid gap-12 md:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_24rem] xl:gap-16'>
                <ol className='relative'>
                    {steps.map((step, index) => (
                        <li
                            key={step.title}
                            className='relative grid grid-cols-[4.5rem_minmax(0,1fr)] gap-6 pb-12 last:pb-0'>
                            {index < steps.length - 1 && (
                                <span
                                    aria-hidden='true'
                                    className='absolute top-14 bottom-2 left-[1.35rem] w-px bg-linear-to-b from-white/15 to-white/0'
                                />
                            )}
                            <span
                                aria-hidden='true'
                                className='font-mono text-5xl leading-none font-light text-stone-600 tabular-nums'>
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            <div>
                                <h3 className='text-2xl font-semibold tracking-tight text-stone-50'>{step.title}</h3>
                                <p className='mt-2 max-w-2xl text-lg leading-8 text-stone-400'>{step.detail}</p>
                                <ul className='mt-4 flex flex-wrap gap-2'>
                                    {step.paths.map((path) => (
                                        <li key={path}>
                                            <code className='rounded-md bg-white/5 px-2 py-1 font-mono text-sm text-stone-300'>
                                                {path}
                                            </code>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </li>
                    ))}
                </ol>

                <aside aria-labelledby='commands-title' className='md:sticky md:top-24 md:self-start'>
                    <h3 id='commands-title' className='text-base font-medium text-stone-200'>
                        Everyday commands
                    </h3>
                    <ul className='mt-4 space-y-4'>
                        {commands.map(({ command, label, purpose }) => (
                            <li key={command}>
                                <CopyCommand command={command} label={label} />
                                <p className='mt-1.5 pl-1 text-sm text-stone-400'>{purpose}</p>
                            </li>
                        ))}
                    </ul>
                </aside>
            </div>
        </Section>
    );
}
