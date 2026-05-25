// SPDX-License-Identifier: Apache-2.0
/**
 * Write tool - Write content to file
 */
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { resolveToCwd, validatePathWithinBase } from './path-utils.js';
/**
 * Create write tool definition
 *
 * @param cwd - Working directory to resolve relative paths against
 */
export function createWriteToolDefinition(cwd) {
    return {
        name: 'write',
        description: 'Write content to a file',
        schema: {},
        async execute(input) {
            const { path: filePath, content, append = false, createDirs = true } = input;
            // Resolve path safely within cwd
            const resolvedPath = resolveToCwd(filePath, cwd);
            // Validate the resolved path is within cwd (security)
            if (!validatePathWithinBase(resolvedPath, cwd)) {
                throw new Error(`Access denied: Path outside working directory`);
            }
            if (createDirs) {
                const dir = dirname(resolvedPath);
                if (!existsSync(dir)) {
                    mkdirSync(dir, { recursive: true });
                }
            }
            writeFileSync(resolvedPath, content, append ? { flag: 'a' } : { flag: 'w' });
            return {
                success: true,
                path: filePath,
                bytesWritten: Buffer.byteLength(content, 'utf8'),
            };
        },
    };
}
//# sourceMappingURL=write.js.map