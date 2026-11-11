// test-setup - cấu hình kiểm thử môi trường Ink
// Bắt chước nguyên tắc pi-mono: kiểm thử cần mô phỏng TTY và các mã
// điều khiển để Ink render được, tránh lỗi "raw mode not supported".
// Port sang Ink TSX, khong copy code truc iep.

process.env.FORCE_COLOR = "0";
process.env.TERM = "xterm-256color";
process.stdout.columns = process.stdout.columns ?? 80;
process.stdout.rows = process.stdout.rows ?? 24;

/** Giả lập stdin là TTY để Ink không bật chế độ raw thật. */
function mockTty(stream: NodeJS.ReadStream | NodeJS.WriteStream): void {
  const s = stream as unknown as { isTTY?: boolean; setRawMode?: (m: boolean) => void };
  s.isTTY = true;
  s.setRawMode = (mode: boolean) => {
    (stream as unknown as { isRaw?: boolean }).isRaw = mode;
  };
}

mockTty(process.stdin);
mockTty(process.stdout);
mockTty(process.stderr);

/** Vô hiệu hóa bộ đệm chờ escape sequence khi chạy test. */
process.stdin.setEncoding("utf8");
