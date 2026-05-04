/**
 * Làm sạch chuỗi bằng cách thay thế các mã surrogate UTF-16 không cặp 
 * bằng ký tự thay thế Unicode (U+FFFD).
 * Các ký tự BMP (như emoji) có cặp surrogate hợp lệ sẽ được giữ lại.
 */
export function sanitizeSurrogates(input: string): string {
  if (typeof input !== 'string') return '';

  const output: string[] = [];
  let i = 0;

  while (i < input.length) {
    const charCode = input.charCodeAt(i);

    // High surrogate (U+D800 đến U+DBFF)
    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
      // Kiểm tra ký tự tiếp theo có phải low surrogate không
      if (i + 1 < input.length) {
        const nextCode = input.charCodeAt(i + 1);
        if (nextCode >= 0xDC00 && nextCode <= 0xDFFF) {
          // Cặp hợp lệ: giữ cả hai ký tự
          output.push(input[i], input[i + 1]);
          i += 2;
          continue;
        }
      }
      // High surrogate không cặp: thay thế bằng U+FFFD
      output.push('\uFFFD');
      i += 1;
    } 
    // Low surrogate (U+DC00 đến U+DFFF)
    else if (charCode >= 0xDC00 && charCode <= 0xDFFF) {
      // Low surrogate không cặp: thay thế bằng U+FFFD
      output.push('\uFFFD');
      i += 1;
    } 
    // Ký tự thường: giữ lại
    else {
      output.push(input[i]);
      i += 1;
    }
  }

  return output.join('');
}
