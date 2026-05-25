"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateToolCall = validateToolCall;
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
// Cấu hình Ajv khác với legacy (thêm useDefaults)
const validator = new ajv_1.default({
    allErrors: true,
    strict: false,
    coerceTypes: true,
    useDefaults: true,
});
(0, ajv_formats_1.default)(validator);
/**
 * Validate tham số tool call với JSON Schema.
 * Trả về tham số đã validate (có type coercion), ném lỗi nếu thất bại.
 */
function validateToolCall(tools, toolCall) {
    const targetTool = tools.find(tool => tool.name === toolCall.name);
    if (!targetTool) {
        throw new Error(`Tool "${toolCall.name}" chưa được đăng ký`);
    }
    const validate = validator.compile(targetTool.parameters);
    const clonedArgs = structuredClone(toolCall.arguments);
    if (validate(clonedArgs)) {
        return clonedArgs;
    }
    const errorDetails = validate.errors
        ?.map(err => {
        const path = err.instancePath || err.params?.missingProperty || 'root';
        return `  - ${path}: ${err.message}`;
    })
        .join('\n') || 'Lỗi validate không xác định';
    throw new Error(`Tool "${toolCall.name}" lỗi validate tham số:\n${errorDetails}\n\nInput:\n${JSON.stringify(toolCall.arguments, null, 2)}`);
}
//# sourceMappingURL=validation.js.map