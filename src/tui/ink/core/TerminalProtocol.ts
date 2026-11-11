// TerminalProtocol - phân tích chuỗi đàm phán bàn phím terminal
// Bắt chước nguyên tắc terminal.ts resolveEscapeTimeoutMs và
// parseKeyboardProtocolNegotiationSequence:
//   - Nhận diện phản hồi cờ giao thức Kitty (CSI ? <flags> u)
//   - Nhận diện phản hồi Device Attributes (CSI ? ... c)
// Port sang TSX riêng, khon copy code truc iep.

export type KeyboardProtocolNegotiation =
  | { type: "kitty-flags"; flags: number }
  | { type: "device-attributes" };

/** Đọc chuỗi đàm phán giao thức bàn phím. */
export function parseKeyboardProtocolNegotiation(sequence: string): KeyboardProtocolNegotiation | undefined {
  const kitty = /^\x1b\[\?(\d+)u$/.exec(sequence);
  if (kitty) return { type: "kitty-flags", flags: Number.parseInt(kitty[1]!, 10) };
  if (/^\x1b\[\?[\d;]*c$/.test(sequence)) return { type: "device-attributes" };
  return undefined;
}

/** Cờ Kitty từ chuỗi phản hồi, hoặc undefined nếu không phải. */
export function parseKeyboardProtocolFlags(sequence: string): number | undefined {
  const parsed = parseKeyboardProtocolNegotiation(sequence);
  return parsed?.type === "kitty-flags" ? parsed.flags : undefined;
}

/** Tiền tố chuỗi đàm phán đang chờ thêm dữ liệu. */
export function isKeyboardProtocolPrefix(sequence: string): boolean {
  return sequence === "\x1b[" || /^\x1b\[\?[\d;]*$/.test(sequence);
}
