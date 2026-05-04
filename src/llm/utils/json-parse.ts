import { parse as incrementalParse } from 'partial-json';

/**
 * Phân tích chuỗi JSON chưa hoàn chỉnh từ streaming.
 * Thử incremental parse trước (tối ưu cho streaming), fallback sang full parse.
 */
export function parseStreamingJson<T = any>(input: string | undefined): T {
  if (typeof input !== 'string' || input.trim().length === 0) {
    return {} as T;
  }

  // Thử incremental parse trước (dành riêng cho streaming chunks)
  try {
    const parsed = incrementalParse(input);
    if (parsed !== undefined && parsed !== null) {
      return parsed as T;
    }
  } catch { /* Bỏ qua lỗi incremental parse */ }

  // Fallback: thử full JSON parse cho payload hoàn chỉnh
  try {
    return JSON.parse(input) as T;
  } catch {
    return {} as T;
  }
}
