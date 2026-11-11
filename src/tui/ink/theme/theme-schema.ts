// ThemeSchema - kiểm tra tính hợp lệ của file theme JSON
// Bắt chước nguyên tắc pi-mono theme/theme-schema.ts:
//   - Tên theme không được chứa "/" (dành cho cài đặt sáng/tối tự động)
//   - Mỗi token màu chỉ nhận hex, oklch/okhsl, tham chiếu biến, rỗng,
//     hoặc chỉ mục bảng 256
//   - Báo lỗi liệt kê token thiếu rõ ràng
//   - Không dùng typebox: trình xác thực cài qua setThemeJsonValidator
//     để phần trình bày chỉ dùng theme có sẵn không phải trả phí 17MB
// Port sang TSX riêng, khon copy code truc iep.

import { THEME_TOKENS, type ThemeColorValue, type ThemeToken } from "./theme-tokens.js";

export interface ThemeJsonInput {
  $schema?: string;
  name: string;
  appearance?: "dark" | "light";
  vars?: Record<string, ThemeColorValue>;
  colors: Record<string, ThemeColorValue>;
  export?: Record<string, ThemeColorValue>;
}

export type ThemeJsonValidator = (label: string, json: unknown) => ThemeJsonInput;

let themeJsonValidator: ThemeJsonValidator | undefined;

/** Cài trình xác thực đầy đủ. Không cài thì mọi tài liệu được nhận như-is. */
export function setThemeJsonValidator(validator: ThemeJsonValidator): void {
  themeJsonValidator = validator;
}

/** Token nào là bắt buộc, token nào có fallback. */
const REQUIRED_TOKENS = (Object.keys(THEME_TOKENS) as ThemeToken[]).filter(
  (name) => !("fallback" in THEME_TOKENS[name]),
);

/** Kiểm tra một giá trị màu có dạng hợp lệ không. */
function isValidColorValue(value: unknown): boolean {
  if (typeof value === "number") return Number.isInteger(value) && value >= 0 && value <= 255;
  if (typeof value !== "string") return false;
  if (value === "") return true;
  if (/^#[0-9a-f]{3}$|^#[0-9a-f]{6}$/i.test(value)) return true;
  if (/^ok(lch|hsl)\(/i.test(value)) return true;
  // Tham chiếu biến: tên không rỗng, không bắt đầu bằng các tiền tố màu.
  return value.length > 0 && !value.startsWith("#") && !value.startsWith("ok");
}

/**
 * Xác thực một theme, nêu rõ tên các token thiếu.
 * Không có validator cài đặt thì chỉ kiểm tra những điều cơ bản.
 */
export function validateThemeJson(label: string, json: unknown): ThemeJsonInput {
  if (themeJsonValidator) return themeJsonValidator(label, json);

  if (typeof json !== "object" || json === null) {
    throw new Error(`Theme "${label}" không phải object`);
  }
  const doc = json as Partial<ThemeJsonInput>;
  if (typeof doc.name !== "string" || doc.name.length === 0) {
    throw new Error(`Theme "${label}" thiếu trường name`);
  }
  if (doc.name.includes("/")) {
    throw new Error(
      `Tên theme "${doc.name}" không được chứa "/" vì ký tự này dành cho cài đặt sáng/tối tự động.`,
    );
  }

  const colors = doc.colors;
  if (typeof colors !== "object" || colors === null) {
    throw new Error(`Theme "${label}" thiếu trường colors`);
  }

  const missing = REQUIRED_TOKENS.filter((token) => colors[token] === undefined);
  if (missing.length > 0) {
    throw new Error(
      `Theme "${label}" thiếu token bắt buộc:\n${missing.map((t) => `  - ${t}`).join("\n")}\n` +
        `Xem theme có sẵn (dark.json, light.json) để tham khảo giá trị.`,
    );
  }

  for (const [token, value] of Object.entries(colors)) {
    if (!(token in THEME_TOKENS)) {
      throw new Error(`Theme "${label}" có token lạ: ${token}`);
    }
    if (!isValidColorValue(value)) {
      throw new Error(`Theme "${label}" token ${token} có giá trị không hợp lệ: ${String(value)}`);
    }
  }

  return json as ThemeJsonInput;
}

/** Parse tham chiếu biến trong giá trị màu, phát hiện vòng lặp. */
export function resolveColorValue(
  value: ThemeColorValue,
  vars: Record<string, ThemeColorValue>,
  visited = new Set<string>(),
): ThemeColorValue {
  if (typeof value === "number" || value === "" || value.startsWith("#") || /^ok(lch|hsl)\(/i.test(value)) {
    return value;
  }
  if (visited.has(value)) throw new Error(`Tham chiếu biến vòng lặp: ${value}`);
  if (!(value in vars)) throw new Error(`Không tìm thấy biến: ${value}`);
  visited.add(value);
  return resolveColorValue(vars[value]!, vars, visited);
}
