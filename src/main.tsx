import { RouterProvider } from '@tanstack/react-router';
import { initLogger, log } from 'evlog';
import { ResultAsync } from 'neverthrow';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import DevTools from '@/web/components/utils/devtools';
import Providers from '@/web/lib/providers';
import { trpcClient } from '@/web/lib/trpcClient';
import { router } from '@/web/router';
import '@/web/styles/index.css';

const isDev = import.meta.env.DEV;

const rootElement = document.getElementById('root');

function toError(error: unknown): Error {
    if (error instanceof Error) {
        return error;
    }

    return new Error(typeof error === 'string' ? error : 'Unknown renderer error');
}

function waitForFirstPaint(): Promise<void> {
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                resolve();
            });
        });
    });
}

if (isDev) {
    initLogger({
        env: {
            service: 'electron-base-renderer',
            environment: 'development',
        },
        pretty: true,
        stringify: true,
    });
}

if (rootElement) {
    createRoot(rootElement).render(
        <StrictMode>
            <Providers>
                <RouterProvider router={router} />
                {isDev && <DevTools router={router} />}
            </Providers>
        </StrictMode>
    );

    // Signal main after React has had a chance to paint the first frame.
    void ResultAsync.fromPromise(waitForFirstPaint(), toError)
        .andThen(() => {
            log.info('window', 'Renderer first paint reached; sending ready signal.');
            return ResultAsync.fromPromise(trpcClient.system.signalReady.mutate(), toError);
        })
        .match(
            () => {
                log.info('window', 'Renderer ready signal acknowledged.');
            },
            (error) => {
                log.warn('window', 'Failed to send ready signal.');
                console.warn('[window] Failed to send ready signal:', error);
            }
        );
}
