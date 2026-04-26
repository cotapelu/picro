# File Mapping: pi-tui-legacy → src/components

Bảng ánh xạ toàn bộ files từ legacy sang src mới.

| # | Legacy File | src File | Status |
|---|-----------|---------|--------|
| 1 | armin.ts | - | ✗ THIẾU |
| 2 | assistant-message.ts | assistant-message.ts | ✓ TRÙNG |
| 3 | auth-selector-status.ts | - | ✗ THIẾU |
| 4 | autocomplete.ts | autocomplete.ts | ✓ TRÙNG |
| 5 | bash-execution.ts | bash-execution-message.ts | ~ ĐỔI TÊN |
| 6 | bordered-loader.ts | - | ✗ THIẾU |
| 7 | box.ts | box.ts | ✓ TRÙNG |
| 8 | branch-summary-message.ts | - | ✗ THIẾU |
| 9 | cancellable-loader.ts | cancellable-loader.ts | ✓ TRÙNG |
| 10 | compaction-summary-message.ts | - | ✗ THIẾU |
| 11 | config-selector.ts | settings-list.ts | ~ KHÁC |
| 12 | countdown-timer.ts | - | ✗ THIẾU |
| 13 | custom-editor.ts | editor.ts | ~ KHÁC |
| 14 | custom-message.ts | custom-message.ts | ✓ TRÙNG |
| 15 | daxnuts.ts | - | ✗ THIẾU |
| 16 | diff.ts | diff.ts | ✓ TRÙNG |
| 17 | dynamic-border.ts | dynamic-border.ts | ✓ TRÙNG |
| 18 | earendil-announcement.ts | - | ✗ THIẾU |
| 19 | editor-component.ts | editor.ts | ~ KHÁC |
| 20 | editor.ts | editor.ts | ✓ TRÙNG |
| 21 | extension-editor.ts | - | ✗ THIẾU |
| 22 | extension-input.ts | - | ✗ THIẾU |
| 23 | extension-selector.ts | - | ✗ THIẾU |
| 24 | footer.ts | footer.ts | ✓ TRÙNG |
| 25 | fuzzy.ts | fuzzy.ts | ✓ TRÙNG |
| 26 | image.ts | terminal-image.ts | ~ GỘP |
| 27 | index.ts | index.ts | ✓ TRÙNG |
| 28 | input.ts | input.ts | ✓ TRÙNG |
| 29 | interactive-mode.ts | - | ✗ THIẾU (App) |
| 30 | keybinding-hints.ts | keybinding-hints.ts | ✓ TRÙNG |
| 31 | keybindings.ts | keybindings.ts | ✓ TRÙNG |
| 32 | keys.ts | keys.ts | ✓ TRÙNG |
| 33 | kill-ring.ts | kill-ring.ts | ✓ TRÙNG |
| 34 | loader.ts | loader.ts | ✓ TRÙNG |
| 35 | login-dialog.ts | - | ✗ THIẾU |
| 36 | markdown.ts | markdown.ts | ✓ TRÙNG |
| 37 | model-selector.ts | model-selector.ts | ✓ TRÙNG |
| 38 | oauth-selector.ts | - | ✗ THIẾU |
| 39 | scoped-models-selector.ts | - | ✗ THIẾU |
| 40 | select-list.ts | select-list.ts | ✓ TRÙNG |
| 41 | session-selector-search.ts | - | ✗ THIẾU |
| 42 | session-selector.ts | session-selector.ts | ✓ TRÙNG |
| 43 | settings-list.ts | settings-list.ts | ✓ TRÙNG |
| 44 | settings-selector.ts | settings-list.ts | ~ KHÁC |
| 45 | show-images-selector.ts | - | ✗ THIẾU |
| 46 | skill-invocation-message.ts | - | ✗ THIẾU |
| 47 | spacer.ts | spacer.ts | ✓ TRÙNG |
| 48 | stdin-buffer.ts | stdin-buffer.ts | ✓ TRÙNG (COPY) |
| 49 | terminal-image.ts | terminal-image.ts | ✓ TRÙNG |
| 50 | terminal.ts | terminal.ts | ✓ TRÙNG |
| 51 | text.ts | text.ts | ✓ TRÙNG |
| 52 | theme-selector.ts | themes.ts | ~ KHÁC |
| 53 | theme.ts | themes.ts | ~ GỘP |
| 54 | thinking-selector.ts | - | ✗ THIẾU |
| 55 | tool-execution.ts | tool-message.ts | ~ ĐỔI TÊN |
| 56 | tree-selector.ts | - | ✗ THIẾU |
| 57 | truncated-text.ts | truncated-text.ts | ✓ TRÙNG |
| 58 | tui.ts | tui.ts | ✓ TRÙNG |
| 59 | undo-stack.ts | undo-stack.ts | ✓ TRÙNG |
| 60 | user-message-selector.ts | user-message.ts | ~ KHÁC |
| 61 | user-message.ts | user-message.ts | ✓ TRÙNG |
| 62 | utils.ts | utils.ts | ✓ TRÙNG |
| 63 | visual-truncate.ts | truncated-text.ts | ~ GỘP |

---

## THỐNG KÊ

| Status | Số lượng |
|--------|---------|
| ✓ TRÙNG (exact match) | 31 |
| ~ ĐỔI TÊN (renamed) | 2 |
| ~ GỘP (merged) | 3 |
| ~ KHÁC (different) | 6 |
| ✗ THIẾU (missing) | 21 |
| **TỔNG** | **63** |

---

## FILES THIẾU THỰC SỰ (21 files)

| # | File | Lý do |
|---|------|-------|
| 1 | armin.ts | Easter egg |
| 2 | auth-selector-status.ts | App |
| 3 | bordered-loader.ts | Library |
| 4 | branch-summary-message.ts | App |
| 5 | compaction-summary-message.ts | App |
| 6 | countdown-timer.ts | Component |
| 7 | daxnuts.ts | Easter egg |
| 8 | earendil-announcement.ts | Easter egg |
| 9 | extension-editor.ts | App |
| 10 | extension-input.ts | App |
| 11 | extension-selector.ts | App |
| 12 | login-dialog.ts | App |
| 13 | oauth-selector.ts | App |
| 14 | scoped-models-selector.ts | App |
| 15 | session-selector-search.ts | Component |
| 16 | show-images-selector.ts | App |
| 17 | skill-invocation-message.ts | Component |
| 18 | thinking-selector.ts | App |
| 19 | tree-selector.ts | Component |
| 20 | user-message-selector.ts | Component |
| 21 | interactive-mode.ts | App (k cần) |