export {};

declare global {
    interface Window {
        electron: {

            sendToElectron: (channel: string, data: any) => void;
            getFromElectron: (channel: string, callback: (data: any) => void) => void;

            onPowerStatus: (
                callback: (data: { status: string; message: string }) => void
            ) => () => void;

            sendItemsUpdated: (items: any[]) => void;
            onItemsUpdated: (callback: (items: any[]) => void) => () => void;

            sendUserActive: (isActive: boolean) => void;
            onUserActive: (cb: (isActive: boolean) => void) => () => void;

            requestSyncFromActiveWindow: () => void;
            onSyncRequest: (callback: () => void) => () => void;

            showNotification: (opts: { title: string; body: string }) => void
        };
    }
}
