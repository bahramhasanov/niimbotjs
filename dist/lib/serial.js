var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import assert from 'node:assert';
import { promisify } from 'node:util';
import { SerialPort } from 'serialport';
import { debugLog } from './utils.js';
const SERIAL_VENDOR_ID = '3513';
const SERIAL_PRODUCT_ID = '0002';
const SERIAL_MANUFACTURER = 'NIIMBOT';
const SERIAL_BAUD_RATE = 115200;
export class SerialTransport {
    constructor() {
        this.port = null;
        this.handlePortClose = () => {
            this.port = null;
        };
        this.devices = () => __awaiter(this, void 0, void 0, function* () {
            return yield getDevices();
        });
        this.open = (path) => __awaiter(this, void 0, void 0, function* () {
            if (this.isOpen())
                return;
            const printer = yield getPrintDevice(path);
            assert(printer, `Could not find Niimbot: ${path || '(auto detected)'}`);
            return new Promise((resolve, reject) => {
                debugLog(`Connecting to ${printer.path}...`);
                const portOptions = { path: printer.path, baudRate: SERIAL_BAUD_RATE };
                const connectCallback = (error) => {
                    if (error) {
                        const errorMessage = error instanceof Error ? error.message : error;
                        reject(`Connection to ${printer.path} failed; ${errorMessage}`);
                    }
                    else {
                        debugLog('Connection success!');
                        resolve();
                    }
                };
                this.port = new SerialPort(portOptions, connectCallback);
                this.port.on('close', this.handlePortClose);
            });
        });
        this.close = () => {
            var _a;
            if ((_a = this.port) === null || _a === void 0 ? void 0 : _a.isOpen) {
                this.port.close();
                this.port = null;
            }
        };
        this.isOpen = () => {
            var _a;
            return Boolean((_a = this.port) === null || _a === void 0 ? void 0 : _a.isOpen);
        };
        this.read = (size) => {
            var _a;
            assert((_a = this.port) === null || _a === void 0 ? void 0 : _a.isOpen, 'Transport not open');
            return this.port.read(size);
        };
        this.write = (data) => {
            var _a;
            assert((_a = this.port) === null || _a === void 0 ? void 0 : _a.isOpen, 'Transport not open');
            debugLog('Writing data!', data);
            this.port.write(data);
            return promisify(this.port.drain).call(this.port);
        };
    }
}
function getPrintDevice(path) {
    return __awaiter(this, void 0, void 0, function* () {
        const devices = yield SerialPort.list();
        if (path) {
            return devices.find((device) => device.path === path);
        }
        const isWindows = process.platform === 'win32';
        const matchFunc = isWindows ? matchWindowsPrinter : matchDefaultPrinter;
        return devices.find(matchFunc);
    });
}
function getDevices() {
    return __awaiter(this, void 0, void 0, function* () {
        const devices = yield SerialPort.list();
        const isWindows = process.platform === 'win32';
        const matchFunc = isWindows ? matchWindowsPrinter : matchDefaultPrinter;
        return devices.filter(matchFunc);
    });
}
function matchWindowsPrinter(device) {
    return (device.vendorId === SERIAL_VENDOR_ID &&
        device.productId === SERIAL_PRODUCT_ID);
}
function matchDefaultPrinter(device) {
    return (device.manufacturer === SERIAL_MANUFACTURER &&
        device.productId === SERIAL_PRODUCT_ID);
}
//# sourceMappingURL=serial.js.map