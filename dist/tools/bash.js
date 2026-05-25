"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * Bash tool - Execute shell commands
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBashToolDefinition = createBashToolDefinition;
const bash_executor_js_1 = require("./bash-executor.js");
const truncate_js_1 = require("./truncate.js");
/**
 * Create bash tool definition
 */
function createBashToolDefinition() {
    return {
        name: 'bash',
        description: 'Execute a bash command and return output',
        schema: {},
        async execute(input) {
            const result = await (0, bash_executor_js_1.executeBash)(input.command, {
                timeout: input.timeout ? input.timeout * 1000 : undefined,
            });
            let output = result.output;
            if (!result.truncated) {
                const trunc = (0, truncate_js_1.truncateOutput)(output, truncate_js_1.DEFAULT_MAX_BYTES, truncate_js_1.DEFAULT_MAX_LINES);
                if (trunc.truncated) {
                    output = (0, truncate_js_1.truncateTail)(output, truncate_js_1.DEFAULT_MAX_BYTES);
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