/**
 * Làm sạch chuỗi bằng cách thay thế các mã surrogate UTF-16 không cặp
 * bằng ký tự thay thế Unicode (U+FFFD).
 * Các ký tự BMP (như emoji) có cặp surrogate hợp lệ sẽ được giữ lại.
 */
export declare function sanitizeSurrogates(input: string): string;
//# sourceMappingURL=sanitize-unicode.d.ts.map