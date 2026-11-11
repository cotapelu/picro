// MarkdownTransform - áp bộ biến đổi markdown của extension
// Bắt chước nguyên tắc pi-mono components/markdown-transform.ts:
//   - Mỗi transformer nhận markdown + ngữ cảnh (loại tin nhắn, đang stream,
//     chiều rộng, id, timestamp)
//   - isStreaming đọc theo từng lần gọi nên component tái sử dụng vẫn thấy
//     thời điểm stream kết thúc
//   - Transformer lỗi: giữ markdown hiện tại và chạy transformer tiếp theo
// Port sang TSX riêng, khon copy code truc iep.

export interface MarkdownTransformContext {
  messageType: "user" | "assistant" | "assistant-thinking" | "summary" | "custom";
  isStreaming: boolean;
  availableWidth: number;
  messageId?: string;
  timestamp?: string;
}

export type MarkdownTransformer = (
  markdown: string,
  context: MarkdownTransformContext,
) => string | undefined;

/** Tạo hàm biến đổi, đọc isStreaming tại thời điểm gọi. */
export function createMarkdownTransform(
  messageType: MarkdownTransformContext["messageType"],
  isStreaming: () => boolean,
  transformers: readonly MarkdownTransformer[],
  messageId?: string,
  timestamp?: string,
): (markdown: string, availableWidth: number) => string {
  return (markdown, availableWidth) =>
    applyMarkdownTransformers(
      markdown,
      { messageType, isStreaming: isStreaming(), availableWidth, messageId, timestamp },
      transformers,
    );
}

function applyMarkdownTransformers(
  markdown: string,
  context: MarkdownTransformContext,
  transformers: readonly MarkdownTransformer[],
): string {
  let result = markdown;
  for (const transformer of transformers) {
    try {
      const transformed = transformer(result, context);
      if (typeof transformed === "string") result = transformed;
    } catch {
      // Giữ markdown hiện tại, tiếp tục transformer sau.
    }
  }
  return result;
}
