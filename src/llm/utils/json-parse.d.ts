/**
 * Phân tích chuỗi JSON chưa hoàn chỉnh từ streaming.
 * Thử incremental parse trước (tối ưu cho streaming), fallback sang full parse.
 */
export declare function parseStreamingJson<T = any>(input: string | undefined): T;
//# sourceMappingURL=json-parse.d.ts.map