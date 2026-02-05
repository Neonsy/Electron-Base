import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useTRPC } from '@/web/lib/trpc';

const UPDATE_CHANNELS = [
    {
        value: 'stable',
        label: 'Stable',
        description: 'Stable releases only.',
    },
    {
        value: 'beta',
        label: 'Beta',
        description: 'Beta releases, followed by later stable releases.',
    },
] as const;

type UpdateChannel = (typeof UPDATE_CHANNELS)[number]['value'];

function getChannelLabel(channel: UpdateChannel | undefined): string {
    return UPDATE_CHANNELS.find((option) => option.value === channel)?.label ?? 'update channel';
}

export default function UpdateChannelControl() {
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const channelQuery = useQuery(trpc.system.getUpdateChannel.queryOptions());
    const channelMutation = useMutation(
        trpc.system.setUpdateChannel.mutationOptions({
            onSuccess(data) {
                queryClient.setQueryData(trpc.system.getUpdateChannel.queryKey(), data);
            },
        })
    );

    const currentChannel = channelQuery.data?.channel;
    const isBusy = channelQuery.isPending || channelMutation.isPending;

    function selectChannel(channel: UpdateChannel): void {
        if (isBusy || channel === currentChannel) {
            return;
        }

        channelMutation.mutate({ channel });
    }

    let hasError = false;
    let statusMessage = currentChannel
        ? `Current channel: ${getChannelLabel(currentChannel)}.`
        : 'Choose a channel to save your update preference.';

    if (channelQuery.isPending) {
        statusMessage = 'Loading your saved update channel…';
    } else if (channelMutation.isPending) {
        statusMessage = `Saving ${getChannelLabel(channelMutation.variables.channel)} channel…`;
    } else if (channelMutation.isError) {
        hasError = true;
        statusMessage =
            "Couldn't confirm the change. The preference may have been saved even if its update check failed. Reload to verify.";
    } else if (channelMutation.isSuccess) {
        statusMessage = `${getChannelLabel(channelMutation.data.channel)} channel saved for future update checks.`;
    } else if (channelQuery.isError) {
        hasError = true;
        statusMessage = "Couldn't load the saved update channel. Choose Stable or Beta to try saving a preference.";
    }

    return (
        <div className='rounded-2xl border border-white/8 bg-ink-900 p-5 sm:p-6' aria-busy={isBusy}>
            <fieldset className='grid gap-3 md:grid-cols-2' disabled={isBusy} aria-describedby='update-channel-status'>
                <legend className='sr-only'>Choose an update channel</legend>

                {UPDATE_CHANNELS.map((channel) => {
                    const isCurrent = currentChannel === channel.value;

                    return (
                        <label
                            key={channel.value}
                            className={`relative flex min-h-24 items-start gap-4 rounded-lg border p-4 transition-colors focus-within:ring-2 focus-within:ring-renderer focus-within:ring-offset-2 focus-within:ring-offset-ink-900 ${
                                isCurrent
                                    ? 'border-renderer/55 bg-renderer/7'
                                    : 'border-white/10 hover:border-white/20 hover:bg-white/[0.025]'
                            } ${isBusy ? 'cursor-wait opacity-60' : 'cursor-pointer'}`}>
                            <input
                                className='sr-only'
                                type='radio'
                                name='update-channel'
                                value={channel.value}
                                checked={isCurrent}
                                onChange={() => {
                                    selectChannel(channel.value);
                                }}
                            />

                            <span
                                aria-hidden='true'
                                className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                    isCurrent ? 'border-renderer' : 'border-white/30'
                                }`}>
                                {isCurrent && <span className='h-2.5 w-2.5 rounded-full bg-renderer' />}
                            </span>

                            <span className='min-w-0 flex-1'>
                                <span className='mb-1 flex flex-wrap items-center gap-2'>
                                    <span className='font-medium text-white'>{channel.label}</span>
                                    {isCurrent && (
                                        <span className='text-xs text-renderer'>Selected on this device</span>
                                    )}
                                </span>
                                <span className='block text-sm leading-relaxed text-white/45'>
                                    {channel.description}
                                </span>
                            </span>
                        </label>
                    );
                })}
            </fieldset>

            <p
                id='update-channel-status'
                role={hasError ? 'alert' : 'status'}
                className={`mt-4 min-h-5 text-sm ${hasError ? 'text-coral-400' : 'text-slate-500'}`}>
                {statusMessage}
            </p>
        </div>
    );
}
