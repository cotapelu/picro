"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Footer Data Provider
 *
 * Provides read-only data for the footer UI, such as:
 * - Git branch information
 * - Extension status indicators
 * - Session statistics
 * - Other dynamic status info
 */
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultFooterDataProvider = void 0;
exports.createFooterDataProvider = createFooterDataProvider;
exports.getGitInfo = getGitInfo;
const child_process_1 = require("child_process");
/**
 * Simple footer data provider with manual updates
 */
class DefaultFooterDataProvider {
    data = {
        extensions: [],
        custom: {},
    };
    listeners = new Set();
    getData() {
        return { ...this.data, extensions: [...this.data.extensions] };
    }
    /**
     * Update git info
     */
    setGitInfo(info) {
        this.data.git = info;
        this.notify();
    }
    /**
     * Set extension statuses
     */
    setExtensions(extensions) {
        this.data.extensions = extensions;
        this.notify();
    }
    /**
     * Update session info
     */
    setSession(session) {
        this.data.session = session;
        this.notify();
    }
    /**
     * Set custom footer item
     */
    setCustom(key, value) {
        this.data.custom[key] = value;
        this.notify();
    }
    /**
     * Remove custom footer item
     */
    removeCustom(key) {
        delete this.data.custom[key];
        this.notify();
    }
    onChange(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }
    notify() {
        const data = this.getData();
        for (const listener of this.listeners) {
            try {
                listener(data);
            }
            catch {
                // Ignore listener errors
            }
        }
    }
}
exports.DefaultFooterDataProvider = DefaultFooterDataProvider;
/**
 * Create default footer data provider
 */
function createFooterDataProvider() {
    return new DefaultFooterDataProvider();
}
/**
 * Simple utility to read git info from command line
 * Used by modes that want to display git status in footer
 */
async function getGitInfo(cwd = process.cwd()) {
    try {
        const { spawn } = await Promise.resolve().then(() => __importStar(require('child_process')));
        const result = (0, child_process_1.spawnSync)('git', ['branch', '--show-current'], { cwd, encoding: 'utf-8' });
        if (result.status !== 0)
            return null;
        const branch = result.stdout?.trim() || 'unknown';
        // Check if dirty
        const statusResult = (0, child_process_1.spawnSync)('git', ['status', '--porcelain'], { cwd, encoding: 'utf-8' });
        const dirty = statusResult.status === 0 && statusResult.stdout?.trim().length > 0;
        // Get ahead/behind
        const revListResult = (0, child_process_1.spawnSync)('git', ['rev-list', '--count', '--left-right', '@{upstream}...HEAD'], {
            cwd,
            encoding: 'utf-8',
        });
        let ahead = 0;
        let behind = 0;
        if (revListResult.status === 0 && revListResult.stdout) {
            const parts = revListResult.stdout.trim().split('\t');
            if (parts.length === 2) {
                ahead = parseInt(parts[0], 10) || 0;
                behind = parseInt(parts[1], 10) || 0;
            }
        }
        return { branch, dirty, ahead: ahead > 0 ? ahead : undefined, behind: behind > 0 ? behind : undefined };
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=footer-data-provider.js.map