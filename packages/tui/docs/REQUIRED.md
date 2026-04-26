# Interactive Coding - Required Files

TOÀN BỘ CÁC COMPONENTS CẦN CHO INTERACTIVE CODING AGENT

Tất cả được import từ `interactive-mode.ts`

---

## CORE COMPONENTS (Message Display)

| # | Component | File | Mô tả |
|---|-----------|------|-------|
| 1 | ArminComponent | armin.ts | Easter egg |
| 2 | AssistantMessageComponent | assistant-message.ts | Assistant message display |
| 3 | BashExecutionComponent | bash-execution.ts | Bash command output |
| 4 | BranchSummaryMessageComponent | branch-summary-message.ts | Git branch change |
| 5 | CompactionSummaryMessageComponent | compaction-summary-message.ts | Context compaction info |
| 6 | CustomMessageComponent | custom-message.ts | Extension messages |
| 7 | DaxnutsComponent | daxnuts.ts | Easter egg |
| 8 | EarendilAnnouncementComponent | earendil-announcement.ts | Easter egg |
| 9 | SkillInvocationMessageComponent | skill-invocation-message.ts | Skill invocation |
| 10 | ToolExecutionComponent | tool-execution.ts | Tool execution display |
| 11 | UserMessageComponent | user-message.ts | User message display |
| 12 | UserMessageSelectorComponent | user-message-selector.ts | User message select |

---

## LOADERS & TIMERS

| # | Component | File | Mô tả |
|---|-----------|------|-------|
| 13 | BorderedLoader | bordered-loader.ts | Spinner with border |
| 14 | CountdownTimer | countdown-timer.ts | Countdown display |

---

## UI COMPONENTS

| # | Component | File | Mô tả |
|---|-----------|------|-------|
| 15 | DynamicBorder | dynamic-border.ts | Dynamic border lines |
| 16 | FooterComponent | footer.ts | Status footer |
| 17 | keyHint, keyText, rawKeyHint | keybinding-hints.ts | Keybinding helpers |
| 18 | TreeSelectorComponent | tree-selector.ts | File tree navigation |

---

## SELECTORS (Dialogs)

| # | Component | File | Mô tả |
|---|-----------|------|-------|
| 19 | LoginDialogComponent | login-dialog.ts | Login dialog |
| 20 | ModelSelectorComponent | model-selector.ts | Model selection |
| 21 | OAuthSelectorComponent | oauth-selector.ts | OAuth provider select |
| 22 | ScopedModelsSelectorComponent | scoped-models-selector.ts | Scoped model select |
| 23 | SessionSelectorComponent | session-selector.ts | Session selection |
| 24 | SessionSelectorSearchComponent | session-selector-search.ts | Session search |
| 25 | SettingsSelectorComponent | settings-selector.ts | Settings UI |
| 26 | ThemeSelectorComponent | theme-selector.ts | Theme selection |

---

## EDITORS

| # | Component | File | Mô tả |
|---|-----------|------|-------|
| 27 | CustomEditor | custom-editor.ts | Extension editor |
| 28 | ExtensionEditorComponent | extension-editor.ts | Editor for extensions |
| 29 | ExtensionInputComponent | extension-input.ts | Extension input |

---

## EXTENSION MANAGEMENT

| # | Component | File | Mô tả |
|---|-----------|------|-------|
| 30 | ExtensionSelectorComponent | extension-selector.ts | Extension selector |

---

## THEME

| # | Function | File | Mô tả |
|---|-----------|------|-------|
| 31 | getAvailableThemes | theme.ts | Theme list |
| 32 | getEditorTheme | theme.ts | Editor styling |
| 33 | getMarkdownTheme | theme.ts | Markdown styling |
| 34 | initTheme | theme.ts | Theme init |
| 35 | onThemeChange | theme.ts | Theme watcher |
| 36 | setTheme | theme.ts | Set theme |
| 37 | Theme objects | theme.ts | Theme definitions |

---

## CONFIG FILES

| # | File |
|---|------|
| 1 | dark.json |
| 2 | light.json |
| 3 | theme-schema.json |

---

## TÓM TẮT

| Loại | Số |
|------|---|
| Total .ts files | 32 |
| Config (.json) | 3 |
| **TỔNG** | **35** |

---

## FILES TRONG src/components/ HIỆN TẠI (50 files)

Ki��m tra xem đã có chưa:

✓ = đã có | ✗ = thiếu

| # | File | Status |
|---|------|--------|
| 1 | armin.ts | ✗ |
| 2 | assistant-message.ts | ✓ |
| 3 | bash-execution.ts | ✗ → bash-execution-message.ts ✓ |
| 4 | bordered-loader.ts | ✗ |
| 5 | branch-summary-message.ts | ✗ |
| 6 | compaction-summary-message.ts | ✗ |
| 7 | countdown-timer.ts | ✗ |
| 8 | custom-editor.ts | ✗ |
| 9 | custom-message.ts | ✓ |
| 10 | daxnuts.ts | ✗ |
| 11 | dynamic-border.ts | ✓ |
| 12 | earendil-announcement.ts | ✗ |
| 13 | extension-editor.ts | ✗ |
| 14 | extension-input.ts | ✗ |
| 15 | extension-selector.ts | ✗ |
| 16 | footer.ts | ✓ |
| 17 | keybinding-hints.ts | ✓ |
| 18 | login-dialog.ts | ✗ |
| 19 | model-selector.ts | ✓ |
| 20 | oauth-selector.ts | ✗ |
| 21 | scoped-models-selector.ts | ✗ |
| 22 | session-selector.ts | ✓ |
| 23 | session-selector-search.ts | ✗ |
| 24 | settings-selector.ts | ✗ |
| 25 | skill-invocation-message.ts | ✗ |
| 26 | theme-selector.ts | ✗ |
| 27 | theme.ts | ✗ |
| 28 | thinking-selector.ts | ✗ |
| 29 | tool-execution.ts | ✗ → tool-message.ts ✓ |
| 30 | tree-selector.ts | ✗ |
| 31 | user-message-selector.ts | ✗ |
| 32 | user-message.ts | ✓ |

---

## CẦN COPY THÊM: 24 FILES