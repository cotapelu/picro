/**
 * Process @file CLI arguments into text content and image attachments.
 * Simple implementation: reads files, detects images via magic numbers,
 * returns concatenated text (with file tags) and base64 image data.
 *
 * Throws errors on failure; callers should handle/report and exit appropriately.
 */
import type { ImageContent } from "../llm/index.js";
export interface ProcessedFiles {
    text: string;
    images: ImageContent[];
}
export interface ProcessFileOptions {
    /** Whether to auto-resize images (currently a no-op, may be implemented later) */
    autoResizeImages?: boolean;
}
/** Process multiple @file arguments */
export declare function processFileArguments(fileArgs: string[], options?: ProcessFileOptions): Promise<ProcessedFiles>;
//# sourceMappingURL=file-processor.d.ts.map