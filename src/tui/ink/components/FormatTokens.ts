// FormatTokens - định dạng số token cho gọn
// Bắt chước nguyên tắc pi-mono footer.ts formatTokens():
//   < 1000      -> nguyên
//   < 10000     -> 1 chữ số thập phân, ví dụ 4.5k
//   < 1e6       -> nguyên hàng nghìn, ví dụ 42k
//   < 1e7       -> 1 chữ số thập phân, ví dụ 1.5M
//   >= 1e7      -> nguyên hàng triệu
// Port sang Ink TSX, khong copy code truc tiep.

export function formatTokens(count: number): string {
  if (!Number.isFinite(count) || count < 0) return "0";
  if (count < 1000) return count.toString();
  if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
  if (count < 1000000) return `${Math.round(count / 1000)}k`;
  if (count < 10000000) return `${(count / 1000000).toFixed(1)}M`;
  return `${Math.round(count / 1000000)}M`;
}
