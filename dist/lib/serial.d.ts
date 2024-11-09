/// <reference types="node" resolution-mode="require"/>
export type SerialDevice = {
    path?: string;
    vendorId?: string;
    productId?: string;
    manufacturer?: string;
};
export declare class SerialTransport {
    private port;
    private handlePortClose;
    devices: () => Promise<SerialDevice[]>;
    open: (path?: string) => Promise<void>;
    close: () => void;
    isOpen: () => boolean;
    read: (size?: number) => any;
    write: (data: Buffer) => any;
}
