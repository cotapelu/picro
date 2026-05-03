# Nguyên tắc phân lớp

Chia code thành các lớp theo thứ tự dependency tăng dần. Mỗi lớp chỉ được phép import từ lớp dưới nó (hoặc cùng lớp).

## Lớp 1 – Atoms (foundation)

- **Không phụ thuộc** vào bất kỳ internal module nào (ngoài atoms).
- Chỉ dùng:
  - Node built-ins
  - External packages
  - **intra-layer** (atoms khác)
- Ví dụ: `base`, `keys`, `utils`, `fuzzy`, `autocomplete`, `kill-ring`, `undo-stack`, `i18n`, `object-pool`, `resource-bundle`, `internal-utils`, `types`.
- Bao gồm cả **primitive UI components** (render-only, không interactive) như: `text`, `spacer`, `divider`, `badge`, `rating`, `progress-bar`, `stepper`, `visual-truncate`, `dynamic-border`, `auth-selector-status`, `box`, `flex`, `grid`, `truncated-text`, `markdown`, `toast`, `breadcrumbs`, `table`, `diff`, `footer`, `stats-footer`, `debug-overlay`, `layout-inspector`, `keybinding-hints`, `user-message`, `tool-execution`, `branch-summary-message`, `compaction-summary-message`, `skill-invocation-message`, `earendil-announcement`.

## Lớp 2 – Molecules

- Chỉ được phép import từ **Atoms (lớp 1)** hoặc **intra-layer** (cùng molecules).
- **Không được** import từ lớp cao hơn (`organisms`, `interactive`, `engine`).
- Chứa các UI component **interactive** hoặc phức tạp hơn (có thể implements `InteractiveElement`).
- Là building blocks cho organisms.
- Ví dụ (các component còn lại trong molecules):
  - **Layout**: `split-pane`
  - **Text & Display**: `tree-view`
  - **Input & Controls**: `input`, `select-list`, `settings-list`, `countdown-timer`
  - **Editors**: `editor`
  - **Overlays**: `modal`, `context-menu`, `loader`, `login-dialog`
  - **Selectors**: `config-selector`, `extension-selector`, `session-selector`, `model-selector`, `theme-selector`, `tree-selector`, `user-message-selector`, ...
  - **Panels**: `debug-panel`
  - **Chrome**: (đã chuyển hết sang atoms)

## Lớp 3 – Organisms

- **Bắt buộc** phải import ít nhất một **molecule** từ lớp 2.
- Có thể import từ:
  - **Atoms (lớp 1)**
  - **Molecules (lớp 2)**
  - **intra-layer** (cùng organisms/lớp 3)
- Là complex components: overlays, panels, editors, selectors, messages.
- Ví dụ: `bash-execution-message`, `cancellable-loader`, `command-palette`, `custom-message`, `file-browser`, `form`, `memory-panel`, `thinking-selector`, `tool-message`.

## Lớp 4 – Interactive (cao nhất)

- **Bắt buộc** phải import ít nhất một **organism** từ lớp 3.
- Có thể import từ:
  - **Atoms (lớp 1)**
  - **Molecules (lớp 2)**
  - **Organisms (lớp 3)**
  - **intra-layer** (cùng interactive/lớp 4)
- Là module orchestration, mode manager, và hệ thống cao nhất.
- Ví dụ: `interactive-mode`, `tui`, `extensions`.

---

**Quy tắc phân loại:**
1. Phân từ dưới lên: atoms trước, sau đó molecules, organisms, interactive.
2. Nếu file không đủ điều kiện cho lớp X (ví dụ: không import molecule), đưa về lớp dưới (ví dụ: molecules).
3. Mỗi lớp có thư mục riêng: `src/atoms/`, `src/molecules/`, `src/organisms/`, `src/interactive/`.
4. Export thông qua index.js trong từng thư mục.
