export {};

declare global {
    interface Window {
        electron: {

            sendToElectron: (channel: string, data: any) => void;
            getFromElectron: (channel: string, callback: (data: any) => void) => void;

            onPowerStatus: (
                callback: (data: { status: string; message: string }) => void
            ) => () => void;

        };
    }
}
