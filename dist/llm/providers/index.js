"use strict";
/**
 * Provider implementations
 *
 * Currently supports:
 * - openai-compatible (OpenAI, Anthropic, Google, Groq, Cerebras, xAI, Mistral, HuggingFace, ZAI, OpenCode, NVIDIA NIM, etc.)
 *
 * Future: Add native providers (bedrock, vertex, etc.)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.complete = exports.stream = void 0;
var openai_compatible_js_1 = require("./openai-compatible.js");
Object.defineProperty(exports, "stream", { enumerable: true, get: function () { return openai_compatible_js_1.stream; } });
Object.defineProperty(exports, "complete", { enumerable: true, get: function () { return openai_compatible_js_1.complete; } });
//# sourceMappingURL=index.js.map