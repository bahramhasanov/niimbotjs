/// <reference types="node" resolution-mode="require"/>
export declare class Packet {
    type: number;
    data: Buffer;
    constructor(type: number, data: Buffer);
    static fromBytes: (bytes: Buffer) => Packet;
    toBytes: () => Buffer;
}
