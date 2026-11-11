// EditorComponent - giao diện cho editor do ngoài cung cấp
// Bắt chước nguyên tắc pi-tui editor-component.ts:
//   - Cho phép extension thay trình soạn thảo (vim, emacs, phím tắt riêng)
//   - Vẫn tương thích với lõi ứng dụng
// Port sang TSX riêng, khong copy code truc iep.

export interface EditorComponent {
  /** Lấy nội dung hiện tại. */
  getText(): string;
  /** Đặt nội dung. */
  setText(text: string): void;
  /** Nhận dữ liệu thô từ terminal (phím, paste, ...). */
  handleInput(data: string): void;

  /** Gọi khi người dùng gửi (Enter). */
  onSubmit?: (text: string) => void;
  /** Gọi khi nội dung thay đổi. */
  onChange?: (text: string) => void;

  /** Thêm vào lịch sử để duyệt bằng mũi tên lên/xuống. */
  addToHistory?(text: string): void;

  /** Chèn văn bản tại con trỏ. */
  insertTextAtCursor?(text: string): void;
  /** Nội dung với marker đã mở rộng; mặc định bằng getText(). */
  getExpandedText?(): string;

  /** Đặt nhà cung cấp gợi ý. */
  setAutocompleteProvider?(provider: AutocompleteProvider): void;

  /** Hàm màu viền. */
  borderColor?: (str: string) => string;
  /** Đặt đệm ngang. */
  setPaddingX?(padding: number): void;
  /** Số mục gợi ý hiển thị tối đa. */
  setAutocompleteMaxVisible?(maxVisible: number): void;
}

/** Giao diện nhà cung cấp gợi ý. */
export interface AutocompleteProvider {
  /** Ký tự kích hoạt tự nhiên ở đầu token. */
  triggerCharacters?: string[];
  getSuggestions(
    lines: string[],
    cursorLine: number,
    cursorCol: number,
    options: { signal: AbortSignal; force?: boolean },
  ): Promise<AutocompleteSuggestions | null>;
  applyCompletion(
    lines: string[],
    cursorLine: number,
    cursorCol: number,
    item: AutocompleteItem,
    prefix: string,
  ): { lines: string[]; cursorLine: number; cursorCol: number };
  shouldTriggerFileCompletion?(lines: string[], cursorLine: number, cursorCol: number): boolean;
}

/** Lệnh slash để gợi ý. */
export interface SlashCommand {
  name: string;
  description?: string;
  /** Gợi ý định dạng tham số. */
  argumentHint?: string;
  /** Lấy gợi ý cho tham số; null nếu không có. */
  getArgumentCompletions?(argumentPrefix: string): Awaitable<AutocompleteItem[] | null>;
}

type Awaitable<T> = T | Promise<T>;

export interface AutocompleteItem {
  value: string;
  label: string;
  description?: string;
}

export interface AutocompleteSuggestions {
  items: AutocompleteItem[];
  prefix: string;
}
