# Danh mục Components

**Tất cả files nằm trong `src/components/`.**

---

## Lớp 1: Foundation

| File | Exports | Mô tả |
|------|---------|-------|
| `base.ts` | `UIElement`, `ElementContainer`, `CURSOR_MARKER`, `InteractiveElement`, `RenderContext`, `KeyEvent`, types | Core interfaces |
| `keys.ts` | `parseKey`, `matchesKey`, `decodeKittyPrintable`, `Key`, `KeyEventType` | Keyboard parsing |
| `utils.ts` | `visibleWidth`, `wrapText`, `truncateToWidth`, `sliceByColumn`, `extractSegments` | Text/ANSI utilities |
| `fuzzy.ts` | `fuzzyMatch`, `fuzzyFilter` | Fuzzy matching |
| `autocomplete.ts` | `AutocompleteProvider`, `CombinedAutocompleteProvider` | Autocomplete engine |
| `kill-ring.ts` | `KillRing` | Emacs clipboard ring |
| `undo-stack.ts` | `UndoStack` | Generic undo stack |
| `editor-component.ts` | `EditorComponent` (interface) | Editor API |

---

## Lớp 2: Simple Components

| File | Exports | Mô tả |
|------|---------|-------|
| `spacer.ts` | `Spacer` | Empty spacing |
| `divider.ts` | `Divider`, `horizontalDivider`, `verticalDivider`, `sectionDivider`, `doubleDivider` | Separator |
| `badge.ts` | `Badge`, `BadgeGroup`, `createBadge`, `statusBadge` | Status labels |
| `progress-bar.ts` | `ProgressBar`, `createProgressBar` | Progress bar |
| `rating.ts` | `Rating`, `createRating` | Star rating |
| `stepper.ts` | `Stepper` | Multi-step wizard |
| `countdown-timer.ts` | `CountdownTimer` | Timer (không phụ thuộc TerminalUI) |
| `text.ts` | `Text` | Multi-line text wrapper |
| `truncated-text.ts` | `TruncatedText` | Truncated single-line text |
| `box.ts` | `Box` | Container với padding/background |

---

## Lớp 3: Interactive Basic

| File | Exports | Mô tả |
|------|---------|-------|
| `input.ts` | `Input`, `InputOptions` | Single-line text input |
| `select-list.ts` | `SelectList`, `SelectItem`, `SelectListTheme`, `SelectListLayoutOptions` | Scrollable list |
| `settings-list.ts` | `SettingsList`, `SettingItem`, `SettingsListTheme` | Toggle settings list |

---

## Lớp 4: Complex Components

### Editors & Display
| File | Exports | Mô tả |
|------|---------|-------|
| `editor.ts` | `Editor`, `EditorOptions` | Multi-line editor |
| `markdown.ts` | `Markdown`, `MarkdownCache`, `defaultTokenColors` | Markdown renderer |
| `terminal-image.ts` | `renderImage`, `encodeKitty`, `encodeITerm2`, `getImageDimensions`, `getCapabilities` | Image rendering |

### Overlays
| File | Exports | Mô tả |
|------|---------|-------|
| `modal.ts` | `Modal`, `ModalOptions` | Modal overlay |
| `toast.ts` | `Toast`, `ToastOptions` | Toast notifications |
| `context-menu.ts` | `ContextMenu`, `ContextMenuOptions` | Context menu |

### UI Chrome
| File | Exports | Mô tả |
|------|---------|-------|
| `footer.ts` | `Footer`, `FooterOptions`, `FooterItem` | Status bar |
| `stats-footer.ts` | `StatsFooter`, `SessionStats` | Footer với session stats |
| `command-palette.ts` | `CommandPalette` | Command palette (dựa trên SelectList) |

### Panels
| File | Exports | Mô tả |
|------|---------|-------|
| `file-browser.ts` | `FileBrowser`, `FileEntry` | File explorer |
| `memory-panel.ts` | `MemoryPanel`, `MemoryPanelOptions` | Memory viewer/editor |
| `debug-panel.ts` | `DebugPanel` | Debug info panel |

### Dialogs
| File | Exports | Mô tả |
|------|---------|-------|
| `login-dialog.ts` | `LoginDialog`, `LoginDialogOptions` | Auth dialog |

### Selectors (13 loại)
| File | Exports | Mô tả |
|------|---------|-------|
| `session-selector.ts` | `SessionSelector`, `SessionSelectorOptions`, `SessionInfo` | Session picker |
| `model-selector.ts` | `ModelSelector`, `ModelSelectorOptions`, `ModelInfo` | Model picker |
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
| File | Exports | Mô tả |
|------|---------|-------|
| `user-message.ts` | `UserMessage`, `UserMessageOptions` | User message |
| `assistant-message.ts` | `AssistantMessage`, `AssistantMessageOptions` | Assistant message |
| `tool-message.ts` | `ToolMessage`, `ToolMessageOptions` | Tool result |
| `bash-execution-message.ts` | `BashExecutionMessage`, `BashExecutionMessageOptions` | Bash execution |
| `custom-message.ts` | `CustomMessage`, `CustomMessageOptions` | Custom message |
| `tool-execution.ts` | `ToolExecutionMessage`, `ToolExecutionOptions` | Tool execution inline |
| `branch-summary-message.ts` | `BranchSummaryMessageComponent` | Branch summary |
| `compaction-summary-message.ts` | `CompactionSummaryMessageComponent` | Compaction summary |
| `skill-invocation-message.ts` | `SkillInvocationMessageComponent` | Skill call |
| `diff.ts` | `renderDiff`, `DiffOptions` | Diff view |

### Easter Eggs
| File | Exports | Mô tả |
|------|---------|-------|
| `armin.ts` | `ArminComponent` | Armin animation |
| `daxnuts.ts` | `DaxnutsComponent` | Daxnuts |
| `earendil-announcement.ts` | `EarendilAnnouncementComponent` | Announcement |

### Utilities (Complex)
| File | Exports | Mô tả |
|------|---------|-------|
| `dynamic-border.ts` | `DynamicBorder` | Animated border |
| `visual-truncate.ts` | `truncateToVisualLines`, `VisualTruncateResult` | Visual truncation |
| `keybinding-hints.ts` | `keyHint`, `keyText`, `rawKeyHint` | Key hint formatting |

---

## Lớp 5: Engine

| File | Exports | Mô tả |
|------|---------|-------|
| `tui.ts` | `TerminalUI` | Main orchestrator (render loop, overlays, focus) |
| `terminal.ts` | `Terminal`, `ProcessTerminal` | Terminal IO abstraction |
| `keybindings.ts` | `getKeybindings`, `KeybindingsManager`, `TUI_KEYBINDINGS` | Global keybinding registry |
| `themes.ts` | `darkTheme`, `lightTheme`, `highContrastTheme`, `ThemeManager`, `themeManager` | Theme definitions |
| `stdin-buffer.ts` | `StdinBuffer`, `StdinBufferOptions` | Input buffering |

---

## Barrel Export (`index.ts`)

Re-exports tất cả public API, organized by category:

- Base types
- TerminalUI & Terminal
- Input & Editor
- Selection (SelectList, SettingsList)
- Display (Text, Markdown, Spacer, Divider, Box, DynamicBorder)
- Loaders (BorderedLoader, CancellableLoader)
- Progress/Rating/Stepper/Badge/Breadcrumbs
- Messages (User, Assistant, Tool, Bash, Custom, ToolExecution)
- UI chrome (Footer, CommandPalette, ContextMenu, FileBrowser, LoginDialog, Modal, Toast, ConfigSelector, MemoryPanel, DebugPanel)
- Selectors (13 types)
- Utilities (fuzzy, kill-ring, undo-stack, diff, internal-utils, keys, keybindings, autocomplete)
- Themes
- Terminal images
- Misc (CountdownTimer, KeybindingHints)
- InteractiveMode
- Extension types

---

*Lưu ý: `llm-context/tui-core/` là reference implementation; `src/` là implementation chính.*
