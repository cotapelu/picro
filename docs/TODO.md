✅ **COMPLETED** (2026-05-19)

The TUI package has been successfully reorganized into a clean layered architecture.

**Result structure**:
```
src/tui/
├── core/       # Non-UI utilities & types (base, keys, utils, themes, etc.)
├── atoms/      # Simple UI primitives (text, spacer, divider, badge, rating, progress-bar, stepper, box, flex, grid, truncated-text, dynamic-border, visual-truncate, daxnuts, armin, animations)
├── molecules/  # Composite components (markdown, table, footer, toast, breadcrumbs, diff, messages, selectors, etc.)
├── organisms/  # Complex UI sections (editor, command-palette, modal, debug-overlay, layout-inspector, etc.)
├── tui.ts
├── interactive-mode.ts
├── extension-ui-context.ts
└── index.ts
```

**Changes summary**:
- Created `core/` with 20+ utility modules (moved from atoms).
- Cleaned `atoms/` to contain only true atomic components (16 UIElement classes).
- Moved 19 molecule-level components from atoms → molecules.
- Moved 2 organism-level components from atoms → organisms.
- Updated all imports across the codebase (atoms, molecules, organisms, root files).
- Updated index.ts files for proper re-exports.
- Adjusted tests (mock paths, wrapText empty handling, atoms/index expectations).
- Build passes, 1660/1662 tests pass (2 unrelated failures).

**Files changed**: 187 files (839 insertions, 566 deletions).

---

Original plan preserved below for reference.

---

## 📋 Danh Sách Công Việc

### Giai đoạn 1: Tạo Core và Di Chuyển Utilities

1. **Tạo thư mục `src/tui/core/`**
2. **Di chuyển các file sau từ `atoms/` sang `core/`** (giữ nguyên tên file):
   - `base.ts` (UIElement, RenderContext, types)
   - `keys.ts`
   - `utils.ts`
   - `internal-utils.ts`
   - `themes.ts` (ThemeManager, darkTheme, lightTheme, highContrastTheme)
   - `theme.ts` (ThemeColors, themeManager, getTheme, setTheme, onThemeChange)
   - `i18n.ts`
   - `fuzzy.ts`
   - `autocomplete.ts`
   - `terminal-image.ts`
   - `terminal.ts` (Terminal interface, ProcessTerminal)
   - `color-fallback.ts`
   - `stdin-buffer.ts`
   - `state-serializer.ts`
   - `object-pool.ts`
   - `resource-bundle.ts`
   - `kill-ring.ts`
   - `undo-stack.ts`
   - `keybindings.ts`
   - Các file `.d.ts` như `arabic-reshaper.d.ts`

3. **Cập nhật imports trong tất cả các file**:
   - Trong `atoms/`, thay `from './base'` → `from '../core/base'`
   - Trong `atoms/`, thay `from './internal-utils'` → `from '../core/internal-utils'`
   - Trong `atoms/`, thay `from './keys'` → `from '../core/keys'`
   - Trong `atoms/`, thay `from './utils'` → `from '../core/utils'`
   - Trong `atoms/`, thay `from './themes'` → `from '../core/themes'`
   - Trong `atoms/`, thay `from './theme'` → `from '../core/theme'`
   - Trong `atoms/`, thay `from './i18n'` → `from '../core/i18n'`
   - Trong `atoms/`, thay `from './fuzzy'` → `from '../core/fuzzy'`
   - Trong `atoms/`, thay `from './autocomplete'` → `from '../core/autocomplete'`
   - Trong `atoms/`, thay `from './terminal'` → `from '../core/terminal'`
   - Trong `atoms/`, thay `from './terminal-image'` → `from '../core/terminal-image'`
   - Trong `atoms/`, thay `from './color-fallback'` → `from '../core/color-fallback'`
   - Trong `atoms/`, thay `from './stdin-buffer'` → `from '../core/stdin-buffer'`
   - Trong `atoms/`, thay `from './state-serializer'` → `from '../core/state-serializer'`
   - Trong `atoms/`, thay `from './object-pool'` → `from '../core/object-pool'`
   - Trong `atoms/`, thay `from './resource-bundle'` → `from '../core/resource-bundle'`
   - Trong `atoms/`, thay `from './kill-ring'` → `from '../core/kill-ring'`
   - Trong `atoms/`, thay `from './undo-stack'` → `from '../core/undo-stack'`
   - Trong `atoms/`, thay `from './keybindings'` → `from '../core/keybindings'`

   - Trong `molecules/` và `organisms/`, thay `from '../atoms/base'` → `from '../core/base'`
   - Trong `molecules/` và `organisms/`, thay `from '../atoms/internal-utils'` → `from '../core/internal-utils'`
   - Trong `molecules/` và `organisms/`, thay `from '../atoms/keys'` → `from '../core/keys'`
   - Trong `molecules/` và `organisms/`, thay `from '../atoms/themes'` → `from '../core/themes'`
   - Trong `molecules/` và `organisms/`, thay `from '../atoms/theme'` → `from '../core/theme'`
   - Trong `molecules/` và `organisms/`, thay `from '../atoms/terminal'` → `from '../core/terminal'`
   - Trong `molecules/` và `organisms/`, thay `from '../atoms/terminal-image'` → `from '../core/terminal-image'`
   - Trong `molecules/` và `organisms/`, thay `from '../atoms/keybindings'` → `from '../core/keybindings'`
   - Trong `molecules/` và `organisms/`, thay `from '../atoms/utils'` → `from '../core/utils'`
   - Trong `molecules/` và `organisms/`, thay `from '../atoms/autocomplete'` → `from '../core/autocomplete'`
   - Trong `molecules/` và `organisms/`, thay `from '../atoms/fuzzy'` → `from '../core/fuzzy'`
   - Trong `molecules/` và `organisms/`, thay `from '../atoms/i18n'` → `from '../core/i18n'`
   - Trong `molecules/` và `organisms/`, thay `from '../atoms/color-fallback'` → `from '../core/color-fallback'`
   - Trong `molecules/` và `organisms/`, thay `from '../atoms/stdin-buffer'` → `from '../core/stdin-buffer'`
   - Trong `molecules/` và `organisms/`, thay `from '../atoms/state-serializer'` → `from '../core/state-serializer'`
   - Trong `molecules/` và `organisms/`, thay `from '../atoms/object-pool'` → `from '../core/object-pool'`
   - Trong `molecules/` và `organisms/`, thay `from '../atoms/resource-bundle'` → `from '../core/resource-bundle'`

4. **Cập nhật `tui.ts`** imports từ core thay vì atoms.

---

### Giai đoạn 2: Tái Cấu Trúc Atoms (chỉ còn UIElement đơn giản)

**Di chuyển từ atoms sang molecules**:
- `markdown.ts`
- `table.ts`
- `footer.ts`
- `stats-footer.ts`
- `toast.ts`
- `breadcrumbs.ts`
- `diff.ts`
- `assistant-message.ts`
- `user-message.ts`
- `bash-execution-message.ts`
- `tool-message.ts`
- `tool-execution.ts`
- `branch-summary-message.ts`
- `compaction-summary-message.ts`
- `skill-invocation-message.ts`
- `earendil-announcement.ts`
- `auth-selector-status.ts`
- `keybinding-hints.ts` (mặc dù nó có thể molecules, nhưng nó là hints, nên giữ molecules)
- `progress-bar.ts`, `stepper.ts` (có thể là atoms nhưng đã có tính năng, tùy. Tốt hơn nên giữ trong atoms vì chúng là chỉ số đơn giản, không compose. Nhưng nếu progress-bar có animation? Vẫn đơn giản. Giữ nguyên trong atoms.)
   - `rating.ts` -> atoms.
   - `daxnuts.ts`, `armin.ts`, `animations.ts` -> atoms (easter eggs đơn giản).
- `spacer.ts`, `divider.ts`, `badge.ts` -> atoms (đã đúng).
- `text.ts`, `box.ts`, `flex.ts`, `grid.ts`, `truncated-text.ts`, `dynamic-border.ts`, `visual-truncate.ts` -> atoms (layout primitives).

**Di chuyển từ atoms sang organisms**:
- `terminal.ts` (Terminal emulator)
- `debug-overlay.ts`
- `layout-inspector.ts`

**Giữ nguyên trong atoms (true atoms)**:
- `text.ts`
- `spacer.ts`
- `divider.ts`
- `badge.ts`
- `rating.ts`
- `progress-bar.ts`
- `stepper.ts`
- `box.ts`
- `flex.ts`
- `grid.ts`
- `truncated-text.ts`
- `dynamic-border.ts`
- `visual-truncate.ts`
- `daxnuts.ts`
- `armin.ts`
- `animations.ts`
- Các file utility đã chuyển sang core.

**Di chuyển các molecule/organism từ atoms sang molecules/organisms** cần:
- Cập nhật imports trong file đích (ví dụ: một file trong molecules vẫn có thể import từ `../core/...` và `./other-molecule`).
- Cập nhật `atoms/index.ts` (loại bỏ các export đã di chuyển).
- Cập nhật `molecules/index.ts` (thêm exports mới).
- Cập nhật `organisms/index.ts` (thêm exports mới nếu cần).
- Cập nhật các file khác import từ `../atoms/...` thành `../molecules/...` hoặc `../organisms/...` cho các component đã di chuyển.

---

### Giai đoạn 3: Điều Chỉnh Molecules và Organisms

**Molecules hiện tại đã đúng**:
- `input.ts`, `form.ts`, `loader.ts`, `cancellable-loader.ts`, `countdown-timer.ts`, `extension-input.ts`, `extension-editor.ts`, `extension-selector.ts`, `config-selector.ts`, `extension-selector.ts`, `extension-input.ts`, `extension-editor.ts`, `session-selector.ts`, `session-selector-search.ts`, `model-selector.ts`, `oauth-selector.ts`, `scoped-models-selector.ts`, `settings-list.ts`, `settings-selector.ts`, `show-images-selector.ts`, `tree-selector.ts`, `user-message-selector.ts`, `select-list.ts`, `theme-selector.ts`, `memory-panel.ts`, `keybinding-hints.ts` (đã ở molecules), `split-pane.ts`, `tree-view.ts`.

**Cân nhắc nâng cấp lên organisms**:
- `split-pane.ts` – layout phức tạp với drag, có thể là organism.
- `tree-view.ts` – tree với scroll, selection, có thể là organism.
- `extension-editor.ts` – multi-line editor, có thể là organism nhưng đơn giản, nên giữ molecule.

Quyết định: Giữ `split-pane` và `tree-view` trong molecules vì chúng vẫn là UIElement có thể tái sử dụng, không quá nặng như organism (organism thường là whole sections). Tuy nhiên, nếu chúng quá phức tạp có thể nâng lên organisms. Tạm thời giữ molecules.

**Organisms hiện tại**:
- `command-palette.ts`
- `context-menu.ts`
- `debug-panel.ts`
- `editor.ts`
- `file-browser.ts`
- `login-dialog.ts`
- `modal.ts`
- `thinking-selector.ts`

Di chuyển thêm từ atoms sang organisms:
- `terminal.ts`
- `debug-overlay.ts`
- `layout-inspector.ts`

---

### Giai đoạn 4: Cập Nhật Exports và Index

1. **atoms/index.ts**: Chỉ export các true atoms và utility types from core.
   ```
   export * from '../core/base';  // types
   export * from '../core/internal-utils'; // functions maybe? Không nên export utilities từ atoms. atoms/index nên chỉ export UIElement atoms.
   // Tốt hơn: atoms/index.ts chỉ export các file atoms còn lại: text, spacer, divider, badge, rating, progress-bar, stepper, box, flex, grid, truncated-text, dynamic-border, visual-truncate, daxnuts, armin, animations, và các types từ core/base (re-export types only).
   ```

   Thực tế, atoms/index.ts nên export tất cả các component atoms (UIElement classes) và types (UIElement, RenderContext, etc từ core). Tuy nhiên, nếu core/base.ts export cả types, atoms có thể re-export types để người dùng import từ atoms. Điều này phổ biến.

   Vì vậy, atoms/index.ts sẽ:
   - Re-export types from `../core/base` (UIElement, RenderContext, InteractiveElement, KeyEvent, etc.)
   - Re-export hàm utilities nếu cần (ví dụ: `CURSOR_MARKER`, `resolveDimension`). Tuy nhiên, utilities thường nằm ở core. Có thể export lại qua atoms để backward compatibility.
   - Export tất cả các class atoms còn lại.

2. **molecules/index.ts**: Export tất cả các class molecules.
3. **organisms/index.ts**: Export tất cả các class organisms.
4. **index.ts** (root of tui package): Export từ atoms, molecules, organisms, core nếu cần, và TerminalUI.

   Hiện tại index.ts:
   ```
   export { TerminalUI } from './tui';
   export { ProcessTerminal } from './atoms/terminal';
   export { InteractiveMode } from './interactive-mode';
   export type { InteractiveModeOptions } from './interactive-mode-types';
   ```

   Sau khi di chuyển, ProcessTerminal nằm ở `core/terminal`. Vì vậy, index.ts cần sửa:
   ```
   export { TerminalUI } from './tui';
   export { ProcessTerminal } from './core/terminal';
   export { InteractiveMode } from './interactive-mode';
   export type { InteractiveModeOptions } from './interactive-mode-types';
   ```

5. **tui.ts**: imports từ core, ví dụ: `import type { UIElement, RenderContext, ... } from './core/base';` và `import { isInteractive, CURSOR_MARKER, resolveDimension, ElementContainer } from './core/base';` và `import { darkTheme } from './core/themes';` (vì darkTheme được dùng).

6. **interactive-mode.ts**: cần cập nhật imports tương tự.

---

### Giai đoạn 5: Cập Nhật Tất Cả Imports

Sau khi di chuyển file, cần cập nhật imports trong tất cả các file còn lại (atoms, molecules, organisms, tui.ts, interactive-mode.ts, extension-ui-context.ts, etc.) để tham chiếu đúng đường dẫn mới.

**Công cụ**: Có thể dùng `sed` hoặc `perl` để thay thế hàng loạt. Tuy nhiên, cần thận trọng vì một số import có thể từ file tương tự (ví dụ: `from './base'` trong một file atoms sẽ thành `from '../core/base'`). Một số import từ `../atoms/...` trong molecules sẽ thành `../core/...` hoặc `../molecules/...` tùy theo file được import.

Tôi sẽ phân loại:
- Nhóm A: Import từ `./base`, `./internal-utils`, `./keys`, `./utils`, `./themes`, `./theme`, `./i18n`, `./fuzzy`, `./autocomplete`, `./terminal`, `./terminal-image`, `./color-fallback`, `./stdin-buffer`, `./state-serializer`, `./object-pool`, `./resource-bundle`, `./kill-ring`, `./undo-stack`, `./keybindings` (các file trong `atoms/`). Sau di chuyển, các import này thành `../core/<file>`.
- Nhóm B: Import từ `../atoms/base`, `../atoms/internal-utils`, `../atoms/keys`, `../atoms/themes`, `../atoms/theme`, `../atoms/terminal`, `../atoms/terminal-image`, `../atoms/keybindings` (các file trong `molecules/` và `organisms/`). Sau di chuyển, thành `../core/<file>` (vì core ở cùng cấp với atoms, molecules, organisms).
- Nhóm C: Import từ `../atoms/markdown`, `../atoms/table`, `../atoms/footer`, ... (các component UI đã di chuyển). Sau di chuyển, thành `../molecules/<file>` hoặc `../organisms/<file>` tùy theo đích.
- Nhóm D: Import từ `./atoms/terminal` trong `tui.ts` (ProcessTerminal) -> `./core/terminal`.

Do số lượng file lớn, tôi sẽ dùng script bash để thay thế. Tuy nhiên, vì đây là thao tác quan trọng, tôi nên thực hiện từng bước và kiểm tra build.

---

### Giai đoạn 6: Kiểm Tra Build và Test

1. Chạy `npm run build` (hoặc `tsc`) để đảm bảo không có lỗi compile.
2. Chạy test suite: `npm test` (chỉ định package tui nếu có).
3. Sửa lỗi nếu có.

---

## ✅ Checklist Di Chuyển Chi Tiết

### Files chuyển từ atoms → core

| STT | File | Ghi chú |
|----|------|--------|
| 1 | base.ts | types core |
| 2 | keys.ts | key parsing |
| 3 | utils.ts | generic utils |
| 4 | internal-utils.ts | text utils |
| 5 | themes.ts | ThemeManager + palettes |
| 6 | theme.ts | ThemeColors + simple manager |
| 7 | i18n.ts | i18n |
| 8 | fuzzy.ts | fuzzy matching |
| 9 | autocomplete.ts | providers |
| 10 | terminal-image.ts | image rendering service |
| 11 | terminal.ts | Terminal interface + ProcessTerminal |
| 12 | color-fallback.ts | color adaptation |
| 13 | stdin-buffer.ts | stdin buffer |
| 14 | state-serializer.ts | state serialization |
| 15 | object-pool.ts | object pool |
| 16 | resource-bundle.ts | resources |
| 17 | kill-ring.ts | kill ring |
| 18 | undo-stack.ts | undo stack |
| 19 | keybindings.ts | keybindings definitions |
| 20 | arabic-reshaper.d.ts | types |

### Files chuyển từ atoms → molecules

| STT | File | Ghi chú |
|----|------|--------|
| 1 | markdown.ts | complex UIElement |
| 2 | table.ts | table rendering |
| 3 | footer.ts | status bar |
| 4 | stats-footer.ts | footer with stats |
| 5 | toast.ts | notification popup |
| 6 | breadcrumbs.ts | navigation |
| 7 | diff.ts | diff rendering |
| 8 | assistant-message.ts | message bubble |
| 9 | user-message.ts | message bubble |
| 10 | bash-execution-message.ts | bash output |
| 11 | tool-message.ts | tool result |
| 12 | tool-execution.ts | tool list |
| 13 | branch-summary-message.ts | branch info |
| 14 | compaction-summary-message.ts | compaction info |
| 15 | skill-invocation-message.ts | skill notification |
| 16 | earendil-announcement.ts | announcement |
| 17 | auth-selector-status.ts | auth status list |
| 18 | keybinding-hints.ts | hints grid |
| 19 | armin.ts | easter egg (nếu là UIElement? Đọc: armin.ts) |
| 20 | daxnuts.ts | easter egg (UIElement) |

**Lưu ý**: `keybinding-hints.ts` đang ở atoms, nhưng nó là molecule (hints grid). Nên chuyển sang molecules.

### Files chuyển từ atoms → organisms

| STT | File | Ghi chú |
|----|------|--------|
| 1 | terminal.ts | đã được chuyển? Cẩn thận: terminal.ts đã đượcliệt kê ở core và atoms. Thực tế, atoms/terminal.ts là file UI? Tôi thấy atoms/terminal.ts chứa Terminal interface và ProcessTerminal. Đó là core, không phải UI. Vậy atoms/terminal.ts nên thuộc core. Tuy nhiên, trong danh sách atoms tôi thấy terminal.ts, terminal-image.ts. Terminal-image là service, core. Terminal là core. Vậy không phải organism. |
| 2 | debug-overlay.ts | full-screen overlay |
| 3 | layout-inspector.ts | debug tool |

Tuy nhiên, `terminal.ts` không phải UIElement, nó là service. Vậy nó nằm core. Mình đã liệt kê trong core. Vậy organisms từ atoms không có file nào? Có lẽ từ atoms không cần di chuyển gì sang organisms vì terminal đã là core. Vậy organisms chỉ giữ nguyên từ trước.

Nhưng `terminal` trong atoms/ thực ra là file `terminal.ts` chứa Terminal interface, không phải UI. Vậy để core.

Vậy chỉ cần di chuyển `debug-overlay.ts` và `layout-inspector.ts` từ atoms sang organisms.

Tuy nhiên, `debug-overlay.ts` và `layout-inspector.ts` là UIElement, và chúng là overlay full-screen, nên organism là hợp lý.

### Files giữ nguyên trong atoms

| STT | File |
|----|------|
| 1 | text.ts |
| 2 | spacer.ts |
| 3 | divider.ts |
| 4 | badge.ts |
| 5 | rating.ts |
| 6 | progress-bar.ts |
| 7 | stepper.ts |
| 8 | box.ts |
| 9 | flex.ts |
| 10 | grid.ts |
| 11 | truncated-text.ts |
| 12 | dynamic-border.ts |
| 13 | visual-truncate.ts |
| 14 | daxnuts.ts |
| 15 | armin.ts |
| 16 | animations.ts |
| 17 | types-atoms.ts (type only) |
| 18 | index.ts |
| 19 | base.test.ts (test files giữ nguyên?) |
| ... | Các file test sẽ giữ nguyên cùng thư mục |

Các file test có thể giữ nguyên trong cùng thư mục với component tương ứng. Nhưng sau khi di chuyển component, test file cũng phải di chuyển theo. Ví dụ: `atoms/markdown.test.ts` → `molecules/markdown.test.ts`. Vậy cần di chuyển cả test files theo component.

---

### Di chuyển test files

Khi di chuyển một component file, di chuyển cả file test kèm theo (nếu có). Ví dụ:

- atoms/markdown.test.ts → molecules/markdown.test.ts
- atoms/table.test.ts → molecules/table.test.ts
- atoms/footer.test.ts → molecules/footer.test.ts
- atoms/stats-footer.test.ts → molecules/stats-footer.test.ts
- atoms/toast.test.ts → molecules/toast.test.ts
- atoms/breadcrumbs.test.ts → molecules/breadcrumbs.test.ts
- atoms/diff.test.ts → molecules/diff.test.ts
- atoms/assistant-message.test.ts → molecules/assistant-message.test.ts
- atoms/user-message.test.ts → molecules/user-message.test.ts
- atoms/bash-execution-message.test.ts → molecules/bash-execution-message.test.ts
- atoms/tool-message.test.ts → molecules/tool-message.test.ts
- atoms/tool-execution.test.ts → molecules/tool-execution.test.ts (hiện tại có tool-execution.test.ts? Không thấy trong list, nhưng nếu có)
- atoms/branch-summary-message.test.ts → molecules/branch-summary-message.test.ts
- atoms/compaction-summary-message.test.ts → molecules/compaction-summary-message.test.ts
- atoms/skill-invocation-message.test.ts → molecules/skill-invocation-message.test.ts
- atoms/earendil-announcement.test.ts → molecules/earendil-announcement.test.ts
- atoms/auth-selector-status.test.ts → molecules/auth-selector-status.test.ts
- atoms/keybinding-hints.test.ts → molecules/keybinding-hints.test.ts
- atoms/debug-overlay.test.ts → organisms/debug-overlay.test.ts
- atoms/layout-inspector.test.ts → organisms/layout-inspector.test.ts

Các test file cho atoms (true atoms) giữ nguyên.

---

## ⚠️ Rủi Ro và Lưu Ý

- Có thể quên một số import, gây lỗi compile.
- Các file trong `interactive-mode.ts` có thể import trực tiếp từ atoms, cần kiểm tra kỹ.
- File `tui.ts` import từ `atoms/terminal` là core, cần sửa.
- File `extension-ui-context.ts` có thể import từ atoms, cần sửa.
- Cần đảm bảo không có import cycle.
- Cần chạy build và test sau mỗi giai đoạn lớn.

---

## 🗓️ Thứ Tự Thực Hiện

1. **Chuẩn bị**: Tạo backup branch nếu cần.
2. **Giai đoạn 1**: Tạo core, di chuyển utilities, cập nhật imports trong atoms (đễ).
3. **Giai đoạn 2**: Di chuyển molecule-level components từ atoms sang molecules, cập nhật imports.
4. **Giai đoạn 3**: Di chuyển organism-level components từ atoms sang organisms, cập nhật imports.
5. **Giai đoạn 4**: Cập nhật index.ts, tui.ts, interactive-mode.ts, extension-ui-context.ts, và các file khác.
6. **Giai đoạn 5**: Build & test, sửa lỗi.

---

## 📦 Cuối Cùng: Cấu Trúc Mong Đợi

```
src/tui/
├── core/
│   ├── base.ts
│   ├── keys.ts
│   ├── utils.ts
│   ├── internal-utils.ts
│   ├── themes.ts
│   ├── theme.ts
│   ├── i18n.ts
│   ├── fuzzy.ts
│   ├── autocomplete.ts
│   ├── terminal-image.ts
│   ├── terminal.ts (interface + ProcessTerminal)
│   ├── color-fallback.ts
│   ├── stdin-buffer.ts
│   ├── state-serializer.ts
│   ├── object-pool.ts
│   ├── resource-bundle.ts
│   ├── kill-ring.ts
│   ├── undo-stack.ts
│   ├── keybindings.ts
│   └── *.d.ts
├── atoms/
│   ├── text.ts
│   ├── spacer.ts
│   ├── divider.ts
│   ├── badge.ts
│   ├── rating.ts
│   ├── progress-bar.ts
│   ├── stepper.ts
│   ├── box.ts
│   ├── flex.ts
│   ├── grid.ts
│   ├── truncated-text.ts
│   ├── dynamic-border.ts
│   ├── visual-truncate.ts
│   ├── daxnuts.ts
│   ├── armin.ts
│   ├── animations.ts
│   ├── types-atoms.ts (type only)
│   ├── index.ts (export atoms + core types)
│   └── *.test.ts
├── molecules/
│   ├── markdown.ts
│   ├── table.ts
│   ├── footer.ts
│   ├── stats-footer.ts
│   ├── toast.ts
│   ├── breadcrumbs.ts
│   ├── diff.ts
│   ├── assistant-message.ts
│   ├── user-message.ts
│   ├── bash-execution-message.ts
│   ├── tool-message.ts
│   ├── tool-execution.ts
│   ├── branch-summary-message.ts
│   ├── compaction-summary-message.ts
│   ├── skill-invocation-message.ts
│   ├── earendil-announcement.ts
│   ├── auth-selector-status.ts
│   ├── keybinding-hints.ts
│   ├── input.ts
│   ├── form.ts
│   ├── loader.ts
│   ├── cancellable-loader.ts
│   ├── countdown-timer.ts
│   ├── extension-input.ts
│   ├── extension-editor.ts
│   ├── extension-selector.ts
│   ├── config-selector.ts
│   ├── session-selector.ts
│   ├── session-selector-search.ts
│   ├── model-selector.ts
│   ├── oauth-selector.ts
│   ├── scoped-models-selector.ts
│   ├── settings-list.ts
│   ├── settings-selector.ts
│   ├── show-images-selector.ts
│   ├── tree-selector.ts
│   ├── user-message-selector.ts
│   ├── select-list.ts
│   ├── theme-selector.ts
│   ├── memory-panel.ts
│   ├── split-pane.ts
│   ├── tree-view.ts
│   ├── index.ts (export all molecules)
│   └── *.test.ts
├── organisms/
│   ├── command-palette.ts
│   ├── context-menu.ts
│   ├── debug-panel.ts
│   ├── editor.ts
│   ├── file-browser.ts
│   ├── login-dialog.ts
│   ├── modal.ts
│   ├── thinking-selector.ts
│   ├── debug-overlay.ts (from atoms)
│   ├── layout-inspector.ts (from atoms)
│   ├── index.ts (export all organisms)
│   └── *.test.ts
├── tui.ts
├── interactive-mode.ts
├── extension-ui-context.ts
├── index.ts
└── ... (other root files)
```

---

## 🔧 Công Cụ Hỗ Trợ

Sau khi di chuyển, cần chạy script để fix imports. Có thể dùng bash:

```bash
# Trong atoms, thay ./<file> -> ../core/<file>
find src/tui/atoms -name "*.ts" -not -name "*.test.ts" -exec grep -l "from './\(base\|internal-utils\|keys\|utils\|themes\|theme\|i18n\|fuzzy\|autocomplete\|terminal\|terminal-image\|color-fallback\|stdin-buffer\|state-serializer\|object-pool\|resource-bundle\|kill-ring\|undo-stack\|keybindings\)'" {} \; | xargs sed -i "s/from '\.\/(base\|internal-utils\|keys\|utils\|themes\|theme\|i18n\|fuzzy\|autocomplete\|terminal\|terminal-image\|color-fallback\|stdin-buffer\|state-serializer\|object-pool\|resource-bundle\|kill-ring\|undo-stack\|keybindings)/from '..\/core\/\1/g"

# Trong molecules và organisms, thay ../atoms/<file> -> ../core/<file>
find src/tui/molecules -name "*.ts" -exec grep -l "from '\.\.\/atoms\/\(base\|internal-utils\|keys\|themes\|theme\|terminal\|terminal-image\|keybindings\|utils\|autocomplete\|fuzzy\|i18n\|color-fallback\|stdin-buffer\|state-serializer\|object-pool\|resource-bundle\)'" {} \; | xargs sed -i "s/from '\.\.\/atoms\/\(base\|internal-utils\|keys\|themes\|theme\|terminal\|terminal-image\|keybindings\|utils\|autocomplete\|fuzzy\|i18n\|color-fallback\|stdin-buffer\|state-serializer\|object-pool\|resource-bundle\)/from '..\/core\/\1/g"

# Cập nhật import cho các component UI đã di chuyển (ví dụ từ ../atoms/markdown -> ../molecules/markdown)
# Tương tự cho table, footer, toast, breadcrumbs, diff, assistant-message, user-message, bash-execution-message, tool-message, tool-execution, branch-summary-message, compaction-summary-message, skill-invocation-message, earendil-announcement, auth-selector-status, keybinding-hints.
# Có thể list ra và thay thế thủ công hoặc dùng script.

# Cập nhật tui.ts
sed -i "s/from '\.\/atoms\/terminal'/from '\/core\/terminal'/g" src/tui/tui.ts
sed -i "s/from '\.\/atoms\/base'/from '\/core\/base'/g" src/tui/tui.ts
sed -i "s/from '\.\/atoms\/internal-utils'/from '\/core\/internal-utils'/g" src/tui/tui.ts
sed -i "s/from '\.\/atoms\/themes'/from '\/core\/themes'/g" src/tui/tui.ts (có thể dùng themes.ts)
# Kiểm tra kỹ vì có thể dùng darkTheme từ themes.

# Cập nhật extension-ui-context.ts
grep -l "from '\.\.\/atoms" src/tui/extension-ui-context.ts | xargs sed -i "s/from '\.\.\/atoms\/\(base\|internal-utils\|keys\|themes\|theme\|terminal\|terminal-image\|keybindings\|utils\|autocomplete\|fuzzy\|i18n\|color-fallback\|stdin-buffer\|state-serializer\|object-pool\|resource-bundle\)/from '..\/core\/\1/g"
```

Các sed trên chỉ là ví dụ, cần điều chỉnh chính xác.

---

**Sau khi hoàn thành**, chạy build và test, commit với message: "refactor(tui): reorganize package into atomic design layers (atoms/molecules/organisms/core)".

---

**Người thực hiện**: AI Assistant
**Ngày bắt đầu**: 2026-05-19
**Trạng thái**: Not started
