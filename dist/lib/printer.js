var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import assert from 'node:assert/strict';
import { Packet } from './packet.js';
import { SerialTransport } from './serial.js';
import { wait, debugLog, warnLog } from './utils.js';
const PACKET_TYPE_VALUE_ERROR = 219;
const PACKET_TYPE_UNIMPLEMENTED_ERROR = 0;
const PACKET_READ_INTERVAL = 100;
const PACKET_READ_COUNT = 10;
export var InfoCode;
(function (InfoCode) {
    InfoCode[InfoCode["DENSITY"] = 1] = "DENSITY";
    InfoCode[InfoCode["LABEL_TYPE"] = 3] = "LABEL_TYPE";
    InfoCode[InfoCode["AUTO_SHUTDOWN_TIME"] = 7] = "AUTO_SHUTDOWN_TIME";
    InfoCode[InfoCode["DEVICE_TYPE"] = 8] = "DEVICE_TYPE";
    InfoCode[InfoCode["SOFTWARE_VERSION"] = 9] = "SOFTWARE_VERSION";
    InfoCode[InfoCode["BATTERY"] = 10] = "BATTERY";
    InfoCode[InfoCode["DEVICE_SERIAL"] = 11] = "DEVICE_SERIAL";
    InfoCode[InfoCode["HARDWARE_VERSION"] = 12] = "HARDWARE_VERSION";
})(InfoCode || (InfoCode = {}));
export var RequestCode;
(function (RequestCode) {
    RequestCode[RequestCode["START_PRINT"] = 1] = "START_PRINT";
    RequestCode[RequestCode["START_PAGE_PRINT"] = 3] = "START_PAGE_PRINT";
    RequestCode[RequestCode["SET_DIMENSION"] = 19] = "SET_DIMENSION";
    RequestCode[RequestCode["GET_RFID"] = 26] = "GET_RFID";
    RequestCode[RequestCode["SET_LABEL_DENSITY"] = 33] = "SET_LABEL_DENSITY";
    RequestCode[RequestCode["SET_LABEL_TYPE"] = 35] = "SET_LABEL_TYPE";
    RequestCode[RequestCode["GET_INFO"] = 64] = "GET_INFO";
    RequestCode[RequestCode["SET_AUDIO_SETTING"] = 88] = "SET_AUDIO_SETTING";
    RequestCode[RequestCode["IMAGE_DATA_META"] = 132] = "IMAGE_DATA_META";
    RequestCode[RequestCode["IMAGE_DATA"] = 133] = "IMAGE_DATA";
    RequestCode[RequestCode["CALIBRATE_LABEL"] = 142] = "CALIBRATE_LABEL";
    RequestCode[RequestCode["GET_PRINT_STATUS"] = 163] = "GET_PRINT_STATUS";
    RequestCode[RequestCode["GET_HEART_BEAT"] = 220] = "GET_HEART_BEAT";
    RequestCode[RequestCode["END_PAGE_PRINT"] = 227] = "END_PAGE_PRINT";
    RequestCode[RequestCode["END_PRINT"] = 243] = "END_PRINT";
})(RequestCode || (RequestCode = {}));
export var LabelType;
(function (LabelType) {
    LabelType[LabelType["GAP"] = 1] = "GAP";
    LabelType[LabelType["BLACK"] = 2] = "BLACK";
    LabelType[LabelType["TRANSPARENT"] = 5] = "TRANSPARENT";
})(LabelType || (LabelType = {}));
export class PrinterClient {
    constructor() {
        this.packetBuffer = null;
        this.serial = new SerialTransport();
        this.open = (path) => {
            return this.serial.open(path);
        };
        this.close = () => {
            this.serial.close();
        };
        this.sendPacket = (type_1, ...args_1) => __awaiter(this, [type_1, ...args_1], void 0, function* (type, data = [1], responseOffset = 1) {
            debugLog('Writing packet!', type, data);
            const buffer = data instanceof Buffer ? data : Buffer.from(data);
            const packet = new Packet(type, buffer);
            const responseCode = type + responseOffset;
            yield this.serial.write(packet.toBytes());
            const response = yield this.receivePacket(responseCode);
            if (response) {
                return response;
            }
            else {
                throw new Error('Expected response was never received');
            }
        });
        this.receivePacket = (responseCode) => __awaiter(this, void 0, void 0, function* () {
            for (let i = 0; i < PACKET_READ_COUNT; i++) {
                const packets = this.processChunk();
                for (let j = 0; j < packets.length; j++) {
                    const packet = packets[j];
                    switch (packet.type) {
                        case PACKET_TYPE_VALUE_ERROR: {
                            throw new Error('Received value error');
                        }
                        case PACKET_TYPE_UNIMPLEMENTED_ERROR: {
                            throw new Error('Received unimplemented error');
                        }
                        case responseCode: {
                            return packet;
                        }
                        default: {
                            warnLog(`Expected response code ${responseCode} but received ${packet.type}!`);
                        }
                    }
                }
                // Pause before the next iteration
                yield wait(PACKET_READ_INTERVAL);
            }
            return null;
        });
        this.processChunk = () => {
            const packets = [];
            const chunk = this.serial.read();
            if (!chunk)
                return packets;
            debugLog('Received data!', chunk);
            if (this.packetBuffer) {
                // Add the new data to the buffer
                this.packetBuffer = Buffer.concat([this.packetBuffer, chunk]);
            }
            else {
                this.packetBuffer = Buffer.concat([chunk]);
            }
            while (this.packetBuffer.length > 4) {
                const packetLength = this.packetBuffer[3] + 7;
                if (this.packetBuffer.length >= packetLength) {
                    const packet = Packet.fromBytes(this.packetBuffer.subarray(0, packetLength));
                    debugLog('Received packet!', packet.type, packet.data);
                    packets.push(packet);
                    this.packetBuffer = this.packetBuffer.subarray(packetLength);
                }
            }
            return packets;
        };
        this.print = (sharpImage_1, _a) => __awaiter(this, [sharpImage_1, _a], void 0, function* (sharpImage, { density }) {
            yield this.setLabelDensity(density);
            yield this.setLabelType(1);
            yield this.startPrint();
            yield this.startPagePrint();
            const metadata = yield sharpImage.metadata();
            yield this.setDimensions(metadata.width, metadata.height);
            const imageData = yield prepareImage(sharpImage);
            for (let i = 0; i < imageData.length; i++) {
                yield this.serial.write(imageData[i]);
            }
            yield this.endPagePrint();
            let printCompleted = false;
            // Check the status until completed
            for (let i = 0; i < 5; i++) {
                const status = yield this.getPrintStatus();
                debugLog('Print progress:', status);
                if (status.progress1 === 100 && status.progress2 === 100) {
                    printCompleted = true;
                    break;
                }
                yield wait(500);
            }
            if (!printCompleted) {
                warnLog('Indicated progress did not reach 100%.  Printing may have failed.');
            }
            yield this.endPrint();
        });
        this.getPrintStatus = () => __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.sendPacket(RequestCode.GET_PRINT_STATUS, [1], 16);
            // >HBB
            const page = data.readUInt16BE(0);
            const progress1 = data.readInt8(2);
            const progress2 = data.readInt8(3);
            return { page, progress1, progress2 };
        });
        this.getInfo = (key) => __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.sendPacket(RequestCode.GET_INFO, [key], key);
            switch (key) {
                case InfoCode.DEVICE_SERIAL: {
                    return data.toString('utf-8');
                }
                case InfoCode.SOFTWARE_VERSION:
                case InfoCode.HARDWARE_VERSION: {
                    const major = data.readUInt8(0);
                    const minor = data.readUInt8(1);
                    return `${major}.${minor}`;
                }
                case InfoCode.DEVICE_TYPE: {
                    return data.readUInt16BE(0);
                }
                default: {
                    return data.readUInt8(0);
                }
            }
        });
        this.getHeartBeat = (...args_2) => __awaiter(this, [...args_2], void 0, function* (variant = 4) {
            assert(variant >= 1 && variant <= 4, `Invalid variant range; expected 1 - 4 but got ${variant}`);
            const offsets = {
                4: -3,
                3: 2,
                2: 3,
                1: 1,
            };
            const { data } = yield this.sendPacket(RequestCode.GET_HEART_BEAT, [variant], offsets[variant]);
            let doorOpen = null;
            let hasPaper = null;
            switch (variant) {
                case 1: {
                    doorOpen = Boolean(data[9]);
                    hasPaper = Boolean(data[12]);
                    break;
                }
                case 4: {
                    doorOpen = Boolean(data[4]);
                    hasPaper = Boolean(data[6]);
                    break;
                }
            }
            return { doorOpen, hasPaper };
        });
        this.getRFID = () => __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.sendPacket(RequestCode.GET_RFID);
            if (data[0] == 0)
                return null;
            let uuid = data.subarray(0, 8).toString('hex');
            let idx = 8;
            const barcodeLength = data[idx];
            idx += 1;
            const barcode = data.subarray(idx, idx + barcodeLength).toString('utf-8');
            idx += barcodeLength;
            const serialLength = data[idx];
            idx += 1;
            const serial = data.subarray(idx, idx + serialLength).toString('utf-8');
            idx += serialLength;
            const remainder = data.subarray(idx);
            // >HHB
            const totalLength = remainder.readUInt16BE(0);
            const usedLength = remainder.readUInt16BE(2);
            const type = remainder.readInt8(4);
            return {
                uuid,
                barcode,
                serial,
                totalLength,
                usedLength,
                type,
            };
        });
        this.setLabelType = (type) => {
            assert(type >= 1 && type <= 3);
            return this.sendPacket(RequestCode.SET_LABEL_TYPE, [type], 16);
        };
        this.setLabelDensity = (density) => {
            assert(density >= 1 && density <= 5, `Invalid density range; expected 1 - 5 but got ${density}`);
            return this.sendPacket(RequestCode.SET_LABEL_DENSITY, [density], 16);
        };
        this.startPrint = () => {
            return this.sendPacket(RequestCode.START_PRINT);
        };
        this.endPrint = () => {
            return this.sendPacket(RequestCode.END_PRINT);
        };
        this.startPagePrint = () => {
            return this.sendPacket(RequestCode.START_PAGE_PRINT);
        };
        this.endPagePrint = () => {
            return this.sendPacket(RequestCode.END_PAGE_PRINT);
        };
        this.setDimensions = (width, height) => {
            // >HH
            const data = Buffer.alloc(4);
            data.writeUInt16BE(height, 0);
            data.writeUInt16BE(width, 2);
            return this.sendPacket(RequestCode.SET_DIMENSION, data);
        };
        this.setPowerSound = (enabled) => {
            const data = [1, 2, enabled ? 1 : 0];
            return this.sendPacket(RequestCode.SET_AUDIO_SETTING, data);
        };
        this.setBluetoothSound = (enabled) => {
            const data = [1, 1, enabled ? 1 : 0];
            return this.sendPacket(RequestCode.SET_AUDIO_SETTING, data);
        };
        this.calibrateLabel = (label) => {
            return this.sendPacket(RequestCode.CALIBRATE_LABEL, [label]);
        };
    }
}
export function prepareImage(sharpImage) {
    return __awaiter(this, void 0, void 0, function* () {
        const imageData = [];
        const { data, info } = yield sharpImage
            .greyscale()
            .negate()
            .raw()
            .toBuffer({ resolveWithObject: true });
        const pixelArray = new Uint8ClampedArray(data.buffer);
        const width = info.width;
        const height = info.height;
        const midPoint = Math.floor(width / 2);
        if (width % 8 !== 0) {
            warnLog('Image width not a multiple of 8');
        }
        debugLog('Image info:', info);
        for (let y = 0; y < height; y++) {
            const colIndex = y * width;
            const pixels = pixelArray.subarray(colIndex, colIndex + width);
            let bits = '';
            let bytes = [];
            let left = 0;
            let right = 0;
            pixels.forEach((pixel, index) => {
                const bit = pixel > 0 ? '1' : '0';
                if (bit === '1') {
                    if (index < midPoint) {
                        left++;
                    }
                    else {
                        right++;
                    }
                }
                bits += bit;
                if (bits.length === 8) {
                    bytes.push(parseInt(bits, 2));
                    bits = '';
                }
            });
            const lineData = Buffer.from(bytes);
            const header = Buffer.alloc(6);
            // The current row within the image
            header.writeUInt16BE(y, 0);
            // Relative to the middle, number of pixels to the left
            header.writeUInt8(midPoint - left, 2);
            // Relative to the middle, number of pixels to the right
            header.writeUInt8(midPoint - right, 3);
            // How many times to repeat this row
            header.writeUInt16BE(1, 4);
            const packet = new Packet(RequestCode.IMAGE_DATA, Buffer.concat([header, lineData]));
            imageData.push(packet.toBytes());
        }
        return imageData;
    });
}
//# sourceMappingURL=printer.js.map