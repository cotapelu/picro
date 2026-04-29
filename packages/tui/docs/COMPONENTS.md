# Danh mục Components theo Lớp

## Lớp 1: Foundation

| File | Exports | Mô tả |
|------|---------|-------|
| `keys.ts` | `parseKey`, `matchesKey`, `decodeKittyPrintable`, `Key`, `KeyEventType` | Xử lý phím, Kitty protocol |
| `utils.ts` | `visibleWidth`, `wrapText`, `truncateToWidth`, `sliceByColumn`, `extractSegments` | Text/ANSI utilities |
| `fuzzy.ts` | `fuzzyMatch`, `fuzzyFilter` | Fuzzy matching |
| `autocomplete.ts` | `AutocompleteProvider`, `CombinedAutocompleteProvider` | Autocomplete engine |
| `kill-ring.ts` | `KillRing` | Emacs clipboard |
| `undo-stack.ts` | `UndoStack` | Generic undo stack |
| `editor-component.ts` | `EditorComponent` (interface) | Editor API |

---

## Lớp 2: Simple Components

| Component | Exports | Mô tả |
|-----------|---------|-------|
| `base.ts` | `UIElement`, `ElementContainer`, `CURSOR_MARKER`, `InteractiveElement`, `RenderContext`, `KeyEvent`, types | Core interfaces |
| `spacer.ts` | `Spacer` | Empty spacing |
| `divider.ts` | `Divider`, `horizontalDivider`, `verticalDivider`, `sectionDivider`, `doubleDivider` | Separator |
| `badge.ts` | `Badge`, `BadgeGroup`, `createBadge`, `statusBadge` | Status labels |
| `progress-bar.ts` | `ProgressBar`, `createProgressBar`, `StepperProgress` (alias) | Progress bar |
| `rating.ts` | `Rating`, `createRating` | Star rating |
| `stepper.ts` | `Stepper` | Multi-step wizard |
| `countdown-timer.ts` | `CountdownTimer` | Timer utility (no TUI dependency, inject render callback) |
| `text.ts` | `Text` | Multi-line text wrapper |
| `truncated-text.ts` | `TruncatedText` | Truncated single-line text |
| `box.ts` | `Box` | Container w/ padding/bg |

---

## Lớp 3: Interactive Basic

| Component | Exports | Mô tả |
|-----------|---------|-------|
| `input.ts` | `Input`, `InputOptions` | Single-line text input |
| `select-list.ts` | `SelectList`, `SelectItem`, `SelectListTheme`, `SelectListLayoutOptions` | Scrollable list |
| `settings-list.ts` | `SettingsList`, `SettingItem`, `SettingsListTheme` | Toggle settings |

---

## Lớp 4: Complex Components

### Editor & Display
| Component | Exports | Mô tả |
|-----------|---------|-------|
| `editor.ts` | `Editor`, `EditorOptions` | Multi-line editor (full-featured) |
| `markdown.ts` | `Markdown`, `MarkdownCache`, `defaultTokenColors` | Markdown renderer |
| `terminal-image.ts` | `renderImage`, `encodeKitty`, `encodeITerm2`, `getImageDimensions`, `getCapabilities` | Image rendering |

### Overlay & UI Chrome
| Component | Exports | Mô tả |
|-----------|---------|-------|
| `modal.ts` | `Modal`, `ModalOptions` | Modal overlay |
| `toast.ts` | `Toast`, `ToastOptions` | Toast notifications |
| `context-menu.ts` | `ContextMenu`, `ContextMenuOptions` | Context menu |
| `footer.ts` | `Footer`, `FooterOptions`, `FooterItem` | Status bar |
| `stats-footer.ts` | `StatsFooter`, `SessionStats` | Extended footer with session statistics |
| `command-palette.ts` | `CommandPalette` (extends `SelectList`) | Command palette |

### Panels
| Component | Exports | Mô tả |
|-----------|---------|-------|
| `file-browser.ts` | `FileBrowser`, `FileEntry` | File explorer |
| `memory-panel.ts` | `MemoryPanel`, `MemoryPanelOptions` | Memory viewer/editor |
| `debug-panel.ts` | `DebugPanel` | Debug info |

### Dialogs
| Component | Exports | Mô tả |
|-----------|---------|-------|
| `login-dialog.ts` | `LoginDialog`, `LoginDialogOptions` | Auth dialog |

### Selectors (13 loại)
| Component | Exports | Mô tả |
|-----------|---------|-------|
| `session-selector.ts` | `SessionSelector`, `SessionSelectorOptions`, `SessionInfo` | Session selector |
| `model-selector.ts` | `ModelSelector`, `ModelSelectorOptions`, `ModelInfo` | Model selector |
| `oauth-selector.ts` | `OAuthSelector`, `OAuthSelectorOptions` | OAuth auth |
| `extension-selector.ts` | `ExtensionSelector`, `ExtensionSelectorOptions` | Extension picker |
| `extension-input.ts` | `ExtensionInput`, `ExtensionInputOptions` | Extension input |
| `extension-editor.ts` | `ExtensionEditor`, `ExtensionEditorOptions` | Extension editor |
| `settings-selector.ts` | `SettingsSelector`, `SettingsSelectorOptions` | Settings picker |
| `theme-selector.ts` | `ThemeSelector`, `ThemeSelectorOptions` | Theme picker |
| `show-images-selector.ts` | `ShowImagesSelector`, `ShowImagesSelectorOptions` | Toggle images |
| `tree-selector.ts` | `TreeSelector`, `TreeSelectorOptions` | Tree picker |
| `thinking-selector.ts` | `ThinkingSelector`, `ThinkingSelectorOptions` | Thinking mode |
| `scoped-models-selector.ts` | `ScopedModelsSelector`, `ScopedModelsSelectorOptions` | Scoped models |
| `config-selector.ts` | `ConfigSelector` | Config picker |

### Messages (Chat bubbles)
| Component | Exports | Mô tả |
|-----------|---------|-------|
| `user-message.ts` | `UserMessage`, `UserMessageOptions` | User message |
| `assistant-message.ts` | `AssistantMessage`, `AssistantMessageOptions` | Assistant message |
| `tool-message.ts` | `ToolMessage`, `ToolMessageOptions` | Tool result |
| `bash-execution-message.ts` | `BashExecutionMessage`, `BashExecutionMessageOptions` | Bash output |
| `custom-message.ts` | `CustomMessage`, `CustomMessageOptions` | Custom message |
| `tool-execution.ts` | `ToolExecutionMessage`, `ToolExecutionOptions` | Tool execution |
| `branch-summary-message.ts` | `BranchSummaryMessageComponent` | Branch summary |
| `compaction-summary-message.ts` | `CompactionSummaryMessageComponent` | Compaction summary |
| `skill-invocation-message.ts` | `SkillInvocationMessageComponent` | Skill call |
| `diff.ts` | `renderDiff`, `DiffOptions` | Diff view |

### Easter Eggs
| Component | Exports | Mô tả |
|-----------|---------|-------|
| `armin.ts` | `ArminComponent` | Armin animation |
| `daxnuts.ts` | `DaxnutsComponent` | Daxnuts |
| `earendil-announcement.ts` | `EarendilAnnouncementComponent` | Announcement |

---

## Core Engine & Utilities

| Component | Exports | Mô tả |
|-----------|---------|-------|
| `tui.ts` | `TerminalUI` | Main orchestrator |
| `terminal.ts` | `Terminal`, `ProcessTerminal` | Terminal abstraction |
| `keybindings.ts` | `getKeybindings`, `KeybindingsManager`, `TUI_KEYBINDINGS` | Keybinding registry |
| `themes.ts` | `darkTheme`, `lightTheme`, `highContrastTheme`, `ThemeManager`, `themeManager` | Themes |
| `internal-utils.ts` | `visibleWidth`, `wrapText`, `truncateText`, `truncateToWidth`, `expandTabs`, `wrapTextWithAnsi`, `extractSegments` | Internal utils |
| `dynamic-border.ts` | `DynamicBorder` | Animated border |
| `undostack.ts` | `UndoStack` (import từ Lớp 1) | Re-export |
| `kill-ring.ts` | `KillRing`, `defaultKillRing` (import) | Re-export |
| `fuzzy.ts` | `fuzzyMatch`, `fuzzyFilter` (import) | Re-export |
| `keys.ts` | `parseKey`, `matchesKey`, `isKeyRelease`, `isKeyRepeat`, `decodeKittyPrintable` | Re-export |
| `autocomplete.ts` | `CombinedAutocompleteProvider`, `FilePathAutocompleteProvider`, `SlashCommandAutocompleteProvider` | Re-export |

---

## Index (`index.ts`)

Re-exports tất cả public API theo categories:

- Core base types
- TerminalUI, Terminal
- Input & Editor
- Selection (SelectList, SettingsList)
- Display (Text, Markdown, Spacer, Divider, Box, DynamicBorder)
- Loaders (BorderedLoader, CancellableLoader)
- Progress/Rating/Stepper/Badge/Breadcrumbs
- Messages (User, Assistant, Tool, Bash, Custom, ToolExecution)
- UI chrome (Footer, CommandPalette, ContextMenu, FileBrowser, LoginDialog, Modal, Toast, ConfigSelector, MemoryPanel, DebugPanel)
- Selectors (9+ loại)
- Utilities (fuzzy, kill-ring, undo-stack, diff, internal-utils, keys, keybindings, autocomplete)
- Theme (themes, ThemeManager)
- Terminal images
- Misc (CountdownTimer, KeybindingHints)
- InteractiveMode
- Extensions types
- Easter eggs

---

*Lưu ý:* `llm-context/tui-core/` là reference implementation (không dùng trực tiếp). `src/` là implementation chính.
