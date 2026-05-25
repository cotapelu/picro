"use strict";
// SPDX-License-Identifier: Apache-2.0
/**
 * @picro/llm - OpenAI-Compatible LLM Extension
 *
 * Export all types and functions needed by agent package
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerBufferConfigs = exports.createStreamBuffer = exports.getProviderBufferConfig = exports.StreamBuffer = exports.complete = exports.stream = exports.getModels = exports.getProviders = exports.getModel = exports.MODELS = void 0;
exports.getModelById = getModelById;
// Models and lookup functions
var models_js_1 = require("./models.js");
Object.defineProperty(exports, "MODELS", { enumerable: true, get: function () { return models_js_1.MODELS; } });
Object.defineProperty(exports, "getModel", { enumerable: true, get: function () { return models_js_1.getModel; } });
Object.defineProperty(exports, "getProviders", { enumerable: true, get: function () { return models_js_1.getProviders; } });
Object.defineProperty(exports, "getModels", { enumerable: true, get: function () { return models_js_1.getModels; } });
// Provider APIs  
var openai_compatible_js_1 = require("./providers/openai-compatible.js");
Object.defineProperty(exports, "stream", { enumerable: true, get: function () { return openai_compatible_js_1.stream; } });
Object.defineProperty(exports, "complete", { enumerable: true, get: function () { return openai_compatible_js_1.complete; } });
// Stream optimization
var stream_buffer_js_1 = require("./utils/stream-buffer.js");
Object.defineProperty(exports, "StreamBuffer", { enumerable: true, get: function () { return stream_buffer_js_1.StreamBuffer; } });
Object.defineProperty(exports, "getProviderBufferConfig", { enumerable: true, get: function () { return stream_buffer_js_1.getProviderBufferConfig; } });
Object.defineProperty(exports, "createStreamBuffer", { enumerable: true, get: function () { return stream_buffer_js_1.createStreamBuffer; } });
Object.defineProperty(exports, "providerBufferConfigs", { enumerable: true, get: function () { return stream_buffer_js_1.providerBufferConfigs; } });
// Simple model lookup - returns Model from MODELS
function getModelById(modelId) {
    return (0, models_js_2.getModel)("any", modelId);
}
// Default export
const models_js_2 = require("./models.js");
const openai_compatible_js_2 = require("./providers/openai-compatible.js");
exports.default = {
    MODELS: models_js_2.MODELS,
    getModel: models_js_2.getModel,
    getProviders: models_js_2.getProviders,
    getModels: models_js_2.getModels,
    stream: openai_compatible_js_2.stream,
    complete: openai_compatible_js_2.complete,
    getModelById,
};
//# sourceMappingURL=index.js.map