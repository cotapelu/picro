"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.copyToClipboard = copyToClipboard;
const clipboardy_1 = __importDefault(require("clipboardy"));
async function copyToClipboard(text) {
    try {
        await clipboardy_1.default.write(text);
    }
    catch (err) {
        console.error('Failed to copy to clipboard:', err);
        throw err;
    }
}
//# sourceMappingURL=clipboard.js.map