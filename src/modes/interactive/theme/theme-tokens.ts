// ThemeTokens - siêu dữ liệu token màu của chủ đề
// Bắt chước nguyên tắc pi-mono theme/theme-tokens.ts:
//   - Mỗi token thuộc slot "foreground" hoặc "background"
//   - Token tùy chọn có fallback trỏ tới token khác cùng slot
//   - Kiểm tra fallback hợp lệ khi khai báo
// Port sang TSX riêng, khong copy code truc iep.

export interface ThemeTokenDescriptor {
  slot: "foreground" | "background";
  description: string;
  fallback?: string;
}

export type ThemeTokenDescriptors = Readonly<Record<string, ThemeTokenDescriptor>>;

function defineThemeTokens<const T extends ThemeTokenDescriptors>(tokens: T): T {
  for (const [name, descriptor] of Object.entries(tokens)) {
    if (descriptor.fallback === undefined) continue;
    const fallback = tokens[descriptor.fallback];
    if (fallback === undefined) throw new Error(`Theme token ${name} has unknown fallback ${descriptor.fallback}`);
    if (fallback.slot !== descriptor.slot) {
      throw new Error(`Theme token ${name} has fallback ${descriptor.fallback} in a different color slot`);
    }
  }
  return tokens;
}

/** Siêu dữ liệu token, theo đúng thứ tự dùng trong file theme và JSON Schema. */
export const THEME_TOKENS = defineThemeTokens({
  accent: { slot: "foreground", description: "Màu nhấn chính (logo, mục chọn, con trỏ)" },
  border: { slot: "foreground", description: "Viền thường" },
  borderAccent: { slot: "foreground", description: "Viền được nhấn" },
  borderMuted: { slot: "foreground", description: "Viền mờ" },
  success: { slot: "foreground", description: "Trạng thái thành công" },
  error: { slot: "foreground", description: "Trạng thái lỗi" },
  warning: { slot: "foreground", description: "Trạng thái cảnh báo" },
  muted: { slot: "foreground", description: "Chữ phụ / mờ" },
  dim: { slot: "foreground", description: "Chữ rất mờ" },
  text: { slot: "foreground", description: "Màu chữ mặc định (thường là chuỗi rỗng)" },
  thinkingText: { slot: "foreground", description: "Màu chữ khối suy nghĩ" },
  scrollbarTrack: {
    slot: "foreground",
    description: "Màu rãnh thanh cuộn (mặc định lấy muted)",
    fallback: "muted",
  },
  scrollbarThumb: {
    slot: "foreground",
    description: "Màu thanh cuộn (mặc định lấy text)",
    fallback: "text",
  },
  selectedBg: { slot: "background", description: "Nền mục được chọn" },
  searchMatchBg: {
    slot: "background",
    description: "Nền kết quả tìm kiếm (mặc định lấy selectedBg)",
    fallback: "selectedBg",
  },
  searchMatchText: {
    slot: "foreground",
    description: "Chữ kết quả tìm kiếm (mặc định lấy text)",
    fallback: "text",
  },
  userMessageBg: { slot: "background", description: "Nền tin nhắn người dùng" },
  userMessageText: { slot: "foreground", description: "Màu chữ tin nhắn người dùng" },
  customMessageBg: { slot: "background", description: "Nền tin nhắn tùy biến" },
  customMessageText: { slot: "foreground", description: "Màu chữ tin nhắn tùy biến" },
  customMessageLabel: { slot: "foreground", description: "Màu nhãn loại tin nhắn tùy biến" },
  toolPendingBg: { slot: "background", description: "Hộp thực thi công cụ (đang chờ)" },
  toolSuccessBg: { slot: "background", description: "Hộp thực thi công cụ (thành công)" },
  toolErrorBg: { slot: "background", description: "Hộp thực thi công cụ (lỗi)" },
  toolTitle: { slot: "foreground", description: "Màu tiêu đề hộp công cụ" },
  toolOutput: { slot: "foreground", description: "Màu chữ đầu ra công cụ" },
  mdHeading: { slot: "foreground", description: "Chữ tiêu đề markdown" },
  mdLink: { slot: "foreground", description: "Chữ liên kết markdown" },
  mdLinkUrl: { slot: "foreground", description: "Chữ URL liên kết markdown" },
  mdCode: { slot: "foreground", description: "Mã inline markdown" },
  mdCodeBlock: { slot: "foreground", description: "Nội dung khối mã markdown" },
  mdCodeBlockBorder: { slot: "foreground", description: "Viền khối mã markdown" },
  mdQuote: { slot: "foreground", description: "Chữ trích dẫn markdown" },
  mdQuoteBorder: { slot: "foreground", description: "Viền trích dẫn markdown" },
  mdHr: { slot: "foreground", description: "Đường kẻ ngang markdown" },
  mdListBullet: { slot: "foreground", description: "Dấu đầu dòng markdown" },
  toolDiffAdded: { slot: "foreground", description: "Dòng thêm trong diff" },
  toolDiffRemoved: { slot: "foreground", description: "Dòng xóa trong diff" },
  toolDiffContext: { slot: "foreground", description: "Dòng ngữ cảnh trong diff" },
  syntaxComment: { slot: "foreground", description: "Tô sáng: chú thích" },
  syntaxKeyword: { slot: "foreground", description: "Tô sáng: từ khóa" },
  syntaxFunction: { slot: "foreground", description: "Tô sáng: tên hàm" },
  syntaxVariable: { slot: "foreground", description: "Tô sáng: tên biến" },
  syntaxString: { slot: "foreground", description: "Tô sáng: chuỗi" },
  syntaxNumber: { slot: "foreground", description: "Tô sáng: số" },
  syntaxType: { slot: "foreground", description: "Tô sáng: tên kiểu" },
  syntaxOperator: { slot: "foreground", description: "Tô sáng: toán tử" },
  syntaxPunctuation: { slot: "foreground", description: "Tô sáng: dấu câu" },
  thinkingOff: { slot: "foreground", description: "Viền cấp độ suy nghĩ: off" },
  thinkingMinimal: { slot: "foreground", description: "Viền cấp độ suy nghĩ: minimal" },
  thinkingLow: { slot: "foreground", description: "Viền cấp độ suy nghĩ: low" },
  thinkingMedium: { slot: "foreground", description: "Viền cấp độ suy nghĩ: medium" },
  thinkingHigh: { slot: "foreground", description: "Viền cấp độ suy nghĩ: high" },
  thinkingXhigh: { slot: "foreground", description: "Viền cấp độ suy nghĩ: xhigh" },
  thinkingMax: {
    slot: "foreground",
    description: "Viền cấp độ suy nghĩ: max (mặc định lấy thinkingXhigh)",
    fallback: "thinkingXhigh",
  },
  bashMode: { slot: "foreground", description: "Màu viền editor ở chế độ bash" },
});

export type ThemeToken = keyof typeof THEME_TOKENS;
export type ThemeColor = {
  [K in ThemeToken]: (typeof THEME_TOKENS)[K]["slot"] extends "foreground" ? K : never;
}[ThemeToken];
export type ThemeBg = Exclude<ThemeToken, ThemeColor>;

type OptionalToken = {
  [K in ThemeToken]: (typeof THEME_TOKENS)[K] extends { fallback: string } ? K : never;
}[ThemeToken];
type RequiredToken = Exclude<ThemeToken, OptionalToken>;

export type ThemeColorValues<Value> = {
  [K in RequiredToken]: Value;
} & {
  [K in OptionalToken]?: Value;
};

export type ResolvedThemeColorValues<Value> = Record<ThemeToken, Value>;

/** Giá trị màu trong file theme: hex, oklch/okhsl, chỉ mục bảng 256, hoặc rỗng. */
export type ThemeColorValue = string | number;

/** Bổ sung fallback cho các token tùy chọn bị thiếu. */
export function withThemeTokenFallbacks<Value>(values: ThemeColorValues<Value>): ResolvedThemeColorValues<Value> {
  const resolved = { ...values } as Partial<ResolvedThemeColorValues<Value>>;
  for (const [rawName, descriptor] of Object.entries(THEME_TOKENS)) {
    if (!("fallback" in descriptor)) continue;
    const name = rawName as ThemeToken;
    if (resolved[name] !== undefined) continue;
    const fallbackValue = resolved[descriptor.fallback as ThemeToken];
    if (fallbackValue === undefined) {
      throw new Error(`Theme token ${rawName} has unresolved fallback ${descriptor.fallback}`);
    }
    resolved[name] = fallbackValue;
  }
  return resolved as ResolvedThemeColorValues<Value>;
}
