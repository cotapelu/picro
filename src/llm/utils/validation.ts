import * as Ajv from 'ajv';
import * as ajvFmt from 'ajv-formats';

// Get the default export (constructor) from Ajv namespace
const AjvConstructor = (Ajv as any).default || Ajv;
const validator = new AjvConstructor({
  allErrors: true,
  strict: false,
  coerceTypes: true,
  useDefaults: true,
});

// addFormats also has default export
const addFmt = (ajvFmt as any).default || ajvFmt;
addFmt(validator);

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
    ?.map((err: any) => {
      const path = err.instancePath || err.params?.missingProperty || 'root';
      return `  - ${path}: ${err.message}`;
    })
    .join('\n') || 'Lỗi validate không xác định';

  throw new Error(
    `Tool "${toolCall.name}" lỗi validate tham số:\n${errorDetails}\n\nInput:\n${JSON.stringify(toolCall.arguments, null, 2)}`
  );
}
