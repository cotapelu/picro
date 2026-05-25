"use strict";
// SPDX-License-Identifier: Apache-2.0
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExtensionRuntime = exports.ExtensionRunner = void 0;
var runner_js_1 = require("./runner.js");
Object.defineProperty(exports, "ExtensionRunner", { enumerable: true, get: function () { return runner_js_1.ExtensionRunner; } });
Object.defineProperty(exports, "createExtensionRuntime", { enumerable: true, get: function () { return runner_js_1.createExtensionRuntime; } });
__exportStar(require("./types.js"), exports);
__exportStar(require("./wrapper.js"), exports);
__exportStar(require("./loader.js"), exports);
//# sourceMappingURL=index.js.map