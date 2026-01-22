import { TanStackDevtools } from '@tanstack/react-devtools';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools';
import { formDevtoolsPlugin } from '@tanstack/react-form-devtools';

import type { AnyRouter } from '@tanstack/react-router';

export interface DevToolsProps {
    router: AnyRouter;
}

export default function DevTools({ router }: DevToolsProps) {
    return (
        <TanStackDevtools
            plugins={[
                {
                    name: 'TanStack Router',
                    render: <TanStackRouterDevtoolsPanel router={router} />,
                },
                {
                    name: 'TanStack Query',
                    render: <ReactQueryDevtoolsPanel />,
                },
                formDevtoolsPlugin(),
            ]}
        />
    );
}
