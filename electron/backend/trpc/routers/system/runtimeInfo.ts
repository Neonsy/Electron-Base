import electron from 'electron';

const { app } = electron;

export interface RuntimeInfo {
    appName: string;
    appVersion: string;
    isPackaged: boolean;
    platform: NodeJS.Platform;
    arch: string;
    versions: {
        electron: string;
        chrome: string;
        node: string;
        v8: string;
    };
}

/** Non-sensitive build and runtime facts, suitable for an About screen or bug reports. */
export function getRuntimeInfo(): RuntimeInfo {
    return {
        appName: app.getName(),
        appVersion: app.getVersion(),
        isPackaged: app.isPackaged,
        platform: process.platform,
        arch: process.arch,
        versions: {
            electron: process.versions.electron,
            chrome: process.versions.chrome,
            node: process.versions.node,
            v8: process.versions.v8,
        },
    };
}
