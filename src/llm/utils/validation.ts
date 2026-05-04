import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// Cấu hình Ajv khác với legacy (thêm useDefaults)
const validator = new Ajv({
  allErrors: true,
  strict: false,
  coerceTypes: true,
  useDefaults: true,
});
addFormats(validator);

/**
 * Validate tham số tool call với JSON Schema.
 * Trả về tham số đã validate (có type coercion), ném lỗi nếu thất bại.
 */
export function validateToolCall(tools: any[], toolCall: any): any {
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

  throw new Error(
    `Tool "${toolCall.name}" lỗi validate tham số:\n${errorDetails}\n\nInput:\n${JSON.stringify(toolCall.arguments, null, 2)}`
  );
}
