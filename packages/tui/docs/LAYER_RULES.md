# Nguyên tắc phân lớp

Chia code thành các lớp theo thứ tự dependency tăng dần. Mỗi lớp chỉ được phép import từ lớp dưới nó (hoặc cùng lớp).

## Lớp 1 – Atoms (foundation)

- **Không phụ thuộc** vào bất kỳ internal module nào (ngoài atoms).
- Chỉ dùng:
  - Node built-ins
  - External packages
  - **intra-layer** (atoms khác)
- Ví dụ: `base`, `keys`, `utils`, `fuzzy`, `autocomplete`, `kill-ring`, `undo-stack`, `i18n`, `object-pool`, `resource-bundle`, `internal-utils`, `types`.

## Lớp 2 – Molecules

- Chỉ được phép import từ **Atoms (lớp 1)** hoặc **intra-layer** (cùng molecules).
- **Không được** import từ lớp cao hơn (`organisms`, `interactive`, `engine`).
- UI component đơn giản (render-only) hoặc interactive basic.
- Nếu một file chỉ import atoms → thuộc lớp này.
- Ví dụ: `spacer`, `divider`, `badge`, `progress-bar`, `rating`, `stepper`, `countdown-timer`, `text`, `truncated-text`, `box`, `flex`, `grid`, `table`, `breadcrumbs`, `loader`, `input`, `select-list`, `settings-list`, ...

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
3. Mỗi lớp có thư mục riêng: `src/atoms/`, `src/molecules/`, `src/organisms/`, `src/interactive/`, `src/core/` (engine).
4. Export thông qua index.js trong từng thư mục.
