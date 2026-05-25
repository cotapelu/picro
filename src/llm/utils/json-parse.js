import { parse as incrementalParse } from 'partial-json';
/**
 * Phân tích chuỗi JSON chưa hoàn chỉnh từ streaming.
 * Thử incremental parse trước (tối ưu cho streaming), fallback sang full parse.
 */
export function parseStreamingJson(input) {
    if (typeof input !== 'string' || input.trim().length === 0) {
        return {};
    }
    // Thử incremental parse trước (dành riêng cho streaming chunks)
    try {
        const parsed = incrementalParse(input);
        if (parsed !== undefined && parsed !== null) {
            return parsed;
        }
    }
    catch { /* Bỏ qua lỗi incremental parse */ }
    // Fallback: thử full JSON parse cho payload hoàn chỉnh
    try {
        return JSON.parse(input);
    }
    catch {
        return {};
    }
}
