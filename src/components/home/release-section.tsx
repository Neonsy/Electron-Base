import { CopyCommand, Section } from '@/web/components/home/primitives';

const platforms = [
    {
        name: 'Windows',
        architectures: ['x64'],
        formats: 'NSIS per-user installer',
        files: 1,
    },
    {
        name: 'macOS',
        architectures: ['x64', 'arm64', 'universal'],
        formats: 'DMG, PKG, and the updater ZIP',
        files: 9,
    },
    {
        name: 'Linux',
        architectures: ['x64', 'arm64'],
        formats: 'AppImage, DEB, and RPM',
        files: 6,
    },
];

const totalFiles = platforms.reduce((sum, platform) => sum + platform.files, 0);

const pipeline = [
    'Validate the tag and source',
    'Test the real window on every OS',
    'Build on native runners',
    'Wait for approval',
    `Verify all ${String(totalFiles)} files and manifests`,
    'Publish once, with checksums',
];

export default function ReleaseSection() {
    return (
        <Section
            id='release'
            eyebrow='Distribution'
            title='Ship to every desktop'
            description='A manually approved workflow builds the complete matrix on native runners and publishes a GitHub release only after every file exists. Stable and beta users receive updates on their own channel'>
            <div className='overflow-hidden rounded-2xl border border-white/8'>
                <table className='w-full border-collapse text-left'>
                    <caption className='sr-only'>Release packages by platform</caption>
                    <thead>
                        <tr className='border-b border-white/8 bg-ink-900 text-sm text-stone-500'>
                            <th scope='col' className='px-7 py-3.5 font-medium'>
                                Platform
                            </th>
                            <th scope='col' className='px-7 py-3.5 font-medium'>
                                Architectures
                            </th>
                            <th scope='col' className='px-7 py-3.5 font-medium'>
                                Packages
                            </th>
                            <th scope='col' className='px-7 py-3.5 text-right font-medium'>
                                Files
                            </th>
                        </tr>
                    </thead>
                    <tbody className='divide-y divide-white/6'>
                        {platforms.map((platform) => (
                            <tr key={platform.name}>
                                <th
                                    scope='row'
                                    className='px-7 py-6 text-3xl font-semibold tracking-tight text-stone-50'>
                                    {platform.name}
                                </th>
                                <td className='px-7 py-6'>
                                    <ul className='flex flex-wrap gap-2'>
                                        {platform.architectures.map((architecture) => (
                                            <li
                                                key={architecture}
                                                className='rounded-md bg-white/5 px-2 py-1 font-mono text-sm text-stone-200'>
                                                {architecture}
                                            </li>
                                        ))}
                                    </ul>
                                </td>
                                <td className='px-7 py-6 text-base text-stone-400'>{platform.formats}</td>
                                <td className='px-7 py-6 text-right font-mono text-3xl text-stone-300 tabular-nums'>
                                    {platform.files}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className='border-t border-white/8 bg-ink-900'>
                            <td colSpan={3} className='px-7 py-4 text-base text-stone-500'>
                                Plus update manifests, blockmaps, and SHA256SUMS.txt
                            </td>
                            <td className='px-7 py-4 text-right font-mono text-base text-stone-200 tabular-nums'>
                                {totalFiles} total
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div className='mt-16 grid gap-16 lg:grid-cols-[minmax(0,1fr)_32rem]'>
                <div>
                    <h3 className='text-base font-medium text-stone-200'>What one release run does</h3>
                    <ol className='mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-3'>
                        {pipeline.map((step, index) => (
                            <li key={step} className='border-t border-white/10 pt-4'>
                                <span className='font-mono text-sm text-stone-500 tabular-nums'>
                                    {String(index + 1).padStart(2, '0')}
                                </span>
                                <p className='mt-2 text-base leading-7 text-stone-300'>{step}</p>
                            </li>
                        ))}
                    </ol>
                </div>

                <div>
                    <h3 className='text-base font-medium text-stone-200'>Cut a release</h3>
                    <div className='mt-6 space-y-4'>
                        <div>
                            <CopyCommand
                                command='gh workflow run release.yml -f tag=v1.4.0'
                                label='stable release command'
                            />
                            <p className='mt-1.5 pl-1 text-sm text-stone-400'>Stable: X.Y.Z publishes to latest</p>
                        </div>
                        <div>
                            <CopyCommand
                                command='gh workflow run release.yml -f tag=v1.5.0-beta.1'
                                label='beta release command'
                            />
                            <p className='mt-1.5 pl-1 text-sm text-stone-400'>
                                Beta: X.Y.Z-beta.N publishes a prerelease to beta
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </Section>
    );
}
