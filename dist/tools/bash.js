// SPDX-License-Identifier: Apache-2.0
/**
 * Bash tool - Execute shell commands
 */
import { executeBash } from './bash-executor.js';
import { truncateOutput, truncateTail, DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES } from './truncate.js';
/**
 * Create bash tool definition
 */
export function createBashToolDefinition() {
    return {
        name: 'bash',
        description: 'Execute a bash command and return output',
        schema: {},
        async execute(input) {
            const result = await executeBash(input.command, {
                timeout: input.timeout ? input.timeout * 1000 : undefined,
            });
            let output = result.output;
            if (!result.truncated) {
                const trunc = truncateOutput(output, DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES);
                if (trunc.truncated) {
                    output = truncateTail(output, DEFAULT_MAX_BYTES);
                }
            }
            return {
                output,
                exitCode: result.exitCode,
                truncated: result.truncated,
                fullOutputPath: result.fullOutputPath,
            };
        },
    };
}
//# sourceMappingURL=bash.js.map