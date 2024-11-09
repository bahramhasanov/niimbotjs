/// <reference types="node" resolution-mode="require"/>
import sharp from 'sharp';
import { Packet } from './packet.js';
export declare enum InfoCode {
    DENSITY = 1,
    LABEL_TYPE = 3,
    AUTO_SHUTDOWN_TIME = 7,
    DEVICE_TYPE = 8,
    SOFTWARE_VERSION = 9,
    BATTERY = 10,
    DEVICE_SERIAL = 11,
    HARDWARE_VERSION = 12
}
export declare enum RequestCode {
    START_PRINT = 1,
    START_PAGE_PRINT = 3,
    SET_DIMENSION = 19,
    GET_RFID = 26,
    SET_LABEL_DENSITY = 33,
    SET_LABEL_TYPE = 35,
    GET_INFO = 64,
    SET_AUDIO_SETTING = 88,
    IMAGE_DATA_META = 132,
    IMAGE_DATA = 133,
    CALIBRATE_LABEL = 142,
    GET_PRINT_STATUS = 163,
    GET_HEART_BEAT = 220,
    END_PAGE_PRINT = 227,
    END_PRINT = 243
}
export declare enum LabelType {
    GAP = 1,
    BLACK = 2,
    TRANSPARENT = 5
}
export declare class PrinterClient {
    private packetBuffer;
    private serial;
    open: (path?: string) => Promise<void>;
    close: () => void;
    private sendPacket;
    private receivePacket;
    private processChunk;
    print: (sharpImage: sharp.Sharp, { density }: {
        density: number;
    }) => Promise<void>;
    getPrintStatus: () => Promise<{
        page: number;
        progress1: number;
        progress2: number;
    }>;
    getInfo: (key: InfoCode) => Promise<string | number>;
    getHeartBeat: (variant?: 4 | 3 | 2 | 1) => Promise<{
        doorOpen: boolean;
        hasPaper: boolean;
    }>;
    getRFID: () => Promise<{
        uuid: string;
        barcode: string;
        serial: string;
        totalLength: number;
        usedLength: number;
        type: number;
    }>;
    setLabelType: (type: number) => Promise<Packet>;
    setLabelDensity: (density: number) => Promise<Packet>;
    startPrint: () => Promise<Packet>;
    endPrint: () => Promise<Packet>;
    startPagePrint: () => Promise<Packet>;
    endPagePrint: () => Promise<Packet>;
    setDimensions: (width: number, height: number) => Promise<Packet>;
    setPowerSound: (enabled: boolean) => Promise<Packet>;
    setBluetoothSound: (enabled: boolean) => Promise<Packet>;
    calibrateLabel: (label: LabelType) => Promise<Packet>;
}
export declare function prepareImage(sharpImage: sharp.Sharp): Promise<Buffer[]>;
