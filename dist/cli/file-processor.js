"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Process @file CLI arguments into text content and image attachments.
 * Simple implementation: reads files, detects images via magic numbers,
 * returns concatenated text (with file tags) and base64 image data.
 *
 * Throws errors on failure; callers should handle/report and exit appropriately.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.processFileArguments = processFileArguments;
const promises_1 = require("node:fs/promises");
const path_utils_js_1 = require("../tools/path-utils.js");
/** Magic number signatures for common image formats */
const IMAGE_SIGNATURES = [
    { mime: "image/jpeg", signature: [0xff, 0xd8, 0xff], minLength: 3 },
    { mime: "image/png", signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], minLength: 8 },
    { mime: "image/gif", signature: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], minLength: 6 }, // GIF87a
    { mime: "image/gif", signature: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], minLength: 6 }, // GIF89a
    { mime: "image/webp", signature: [0x52, 0x49, 0x46, 0x46], minLength: 4 }, // "RIFF", then "WEBP" at offset 8
];
const IMAGE_EXTENSIONS = new Map([
    [".jpg", "image/jpeg"],
    [".jpeg", "image/jpeg"],
    [".png", "image/png"],
    [".gif", "image/gif"],
    [".webp", "image/webp"],
]);
/** Detect image mime type from file extension (fallback) */
function detectByExtension(filePath) {
    const ext = filePath.toLowerCase().slice(filePath.lastIndexOf("."));
    return IMAGE_EXTENSIONS.get(ext) || null;
}
/** Detect image mime type by reading file magic numbers */
async function detectByMagic(filePath) {
    try {
        const data = await (0, promises_1.readFile)(filePath);
        for (const img of IMAGE_SIGNATURES) {
            if (data.length >= img.minLength) {
                let match = true;
                for (let i = 0; i < img.signature.length; i++) {
                    if (data[i] !== img.signature[i]) {
                        match = false;
                        break;
                    }
                }
                if (match)
                    return img.mime;
            }
        }
        // Special WebP check: needs "WEBP" at offset 8
        if (data.length >= 12) {
            if (data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46 &&
                data[8] === 0x57 && data[9] === 0x45 && data[10] === 0x42 && data[11] === 0x50) {
                return "image/webp";
            }
        }
    }
    catch {
        // ignore read errors
    }
    return null;
}
/** Process a single file */
async function processFile(filePath, cwd, options) {
    const absolutePath = (0, path_utils_js_1.resolveReadPath)(filePath, cwd);
    // Check if exists and get stats (stat will throw if missing)
    const stats = await (0, promises_1.stat)(absolutePath);
    if (stats.size === 0) {
        return { textPart: "" };
    }
    // Detect image: try magic first, then extension fallback
    let mimeType = await detectByMagic(absolutePath);
    if (!mimeType) {
        mimeType = detectByExtension(absolutePath);
    }
    if (mimeType) {
        // Image file
        const content = await (0, promises_1.readFile)(absolutePath);
        const base64 = content.toString("base64");
        // Simple size check: if autoResizeImages is true and base64 size > ~4.5MB, issue warning and still include.
        // Actual resizing not implemented yet.
        // Max size for Anthropic is 5MB; we allow up to that.
        if (options.autoResizeImages !== false && base64.length > 5 * 1024 * 1024) {
            console.warn(`Warning: Image ${absolutePath} is ${(base64.length / 1024 / 1024).toFixed(1)}MB, may exceed model limits.`);
        }
        const image = {
            type: "image",
            mimeType,
            data: base64,
        };
        return {
            textPart: `<file name="${absolutePath}"></file>\n`,
            image,
        };
    }
    else {
        // Text file
        try {
            const content = await (0, promises_1.readFile)(absolutePath, "utf-8");
            return {
                textPart: `<file name="${absolutePath}">\n${content}\n</file>\n`,
            };
        }
        catch (error) {
            throw new Error(`Could not read file ${absolutePath}: ${error.message}`);
        }
    }
}
/** Process multiple @file arguments */
async function processFileArguments(fileArgs, options) {
    const opts = { autoResizeImages: true, ...options };
    let text = "";
    const images = [];
    for (const fileArg of fileArgs) {
        // Remove @ prefix if present (already done by caller? Convention says fileArgs comes from parsedArgs.fileArgs which have @ removed)
        const cleanPath = fileArg.startsWith("@") ? fileArg.slice(1) : fileArg;
        const result = await processFile(cleanPath, process.cwd(), opts);
        text += result.textPart;
        if (result.image) {
            images.push(result.image);
        }
    }
    return { text, images };
}
//# sourceMappingURL=file-processor.js.map