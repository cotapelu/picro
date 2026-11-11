// ModelSearch - tiện ích tìm kiếm mô hình
// Bắt chước nguyên tắc pi-mono model-search.ts:
//   - getModelSearchText: văn bản tìm kiếm gộp id, provider, cả provider/id
//   - getDistinctModelName: chỉ trả tên khi nó có từ mà id không bao phủ
//   - getModelSelectorSearchText: ưu tiên truy vấn có tiền tố provider
// Port sang TSX riêng, khon copy code truc iep.

export interface ModelSearchItem {
  id: string;
  provider: string;
  name?: string;
}

/** Văn bản dùng để tìm kiếm một mô hình. */
export function getModelSearchText(item: ModelSearchItem): string {
  const { id, provider } = item;
  const name = item.name ? ` ${item.name}` : "";
  return `${id} ${provider} ${provider}/${id} ${provider} ${id}${name}`;
}

const splitLabel = (value: string): string[] =>
  value
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

/**
 * Trả về tên mô hình khi nó chứa từ mà id không có, ví dụ tên ghi đè
 * "MiniMax M3 [rasmus@openrouter, parasail]" cho "minimax/minimax-m3".
 * Tên chỉ diễn lại id (khác hoa/thường, dấu phân cách, hoặc bỏ hậu tố phiên
 * bản) thì trả về undefined.
 */
export function getDistinctModelName(item: { id: string; name?: string }): string | undefined {
  const name = item.name?.trim();
  if (!name) return undefined;
  const idWords = splitLabel(item.id);
  const idTokens = new Set(idWords);
  const compactId = idWords.join("");
  // Từ một ký tự phải khớp nguyên token: "4" không được tính là có trong "mistral-small-2603".
  const isCovered = (word: string) => idTokens.has(word) || (word.length > 1 && compactId.includes(word));
  return splitLabel(name).every(isCovered) ? undefined : name;
}

/**
 * Văn bản tìm kiếm cho selector /model: xếp hạng truy vấn có tiền tố provider
 * trước các id proxy-provider dạng openrouter/openai/gpt-5.
 */
export function getModelSelectorSearchText(item: ModelSearchItem): string {
  const { id, provider } = item;
  const name = item.name ? ` ${item.name}` : "";
  return `${provider} ${provider}/${id} ${provider} ${id}${name}`;
}
