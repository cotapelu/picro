# API Reference for @picro/tui

This document lists the public API of the Terminal UI library.

## Core Classes

- `TerminalUI` - Main UI container with rendering and input handling.
- `ProcessTerminal` - Terminal implementation using stdin/stdout.
- `ElementContainer` - Base class for composite elements.

## Components

### Layout & Basic
- `Text` - Display static text.
- `Spacer` - Empty space.
- `Divider` - Horizontal line.
- `Box` - Border around child elements.
- `DynamicBorder` - Border with dynamic content.

### Input & Editing
- `Input` - Single-line text input.
- `Editor` - Multi-line text editor.

### Selection
- `SelectList` - Scrollable selection list.
- `SettingsList` - List of toggleable settings.

### Display
- `Markdown` - Markdown renderer.
- `UserMessage`, `AssistantMessage`, `ToolMessage` - Chat message bubbles.
- `BashExecutionMessage` - Bash command output display.
- `CustomMessage` - Custom styled message.

### Loaders & Progress
- `BorderedLoader` - Loading spinner.
- `CancellableLoader` - Loader with cancel support.
- `ProgressBar` - Progress indicator.
- `Rating` - Star rating.
- `Stepper` - Step indicator.
- `Badge` - Small status badge.
- `Breadcrumbs` - Breadcrumb navigation.

### UI Chrome
- `Footer` - Status bar.
- `CommandPalette` - Command palette (Ctrl+P).
- `ContextMenu` - Right-click menu.
- `FileBrowser` - File system browser.
- `LoginDialog` - Authentication dialog.
- `Modal` - Modal overlay.
- `Toast` - Temporary notification.
- `ConfigSelector` - Configuration picker.
- `MemoryPanel` - Memory display.
- `DebugPanel` - Debug information.

### Selectors
- `SessionSelector` - Session picker.
- `SettingsSelector` - Settings picker.
- `ModelSelector` - Model selection.
- `OAuthSelector` - OAuth provider selection.
- `ScopedModelsSelector` - Model selection per scope.
- `ExtensionSelector` - Extension picker.
- `ExtensionInput` - Input for extension values.
- `ExtensionEditor` - Editor for extension configs.
- `ThemeSelector` - Theme picker.
- `ShowImagesSelector` - Toggle for images.
- `TreeSelector` - Tree structure picker.
- `ThinkingSelector` - Thinking effort selector.

### Miscellaneous
- `CountdownTimer` - Countdown display.
- `KeybindingHints` - Key hints bar.
- `ArminComponent`, `DaxnutsComponent`, `EarendilAnnouncementComponent` - Easter eggs.

## Utilities

- `visibleWidth(str)` - Calculate display width.
- `wrapText`, `wrapTextWithAnsi`
- `truncateText`, `truncateToWidth`
- `fuzzyMatch`, `fuzzyFilter`, `fuzzyHighlight`
- `parseKey`, `matchesKey`, `isKeyRelease`, `decodeKittyPrintable`
- `getKeybindings`, `KeybindingsManager`
- `KillRing`, `defaultKillRing`, `UndoStack`
- `renderDiff`
- `extractSegments`, `sliceByColumn`, `stripAnsi`, `hasAnsi`
- `getSegmenter`
- `getCellDimensions`, `setCellDimensions`
- `renderImage`, `encodeKitty`, `encodeITerm2`, `getImageDimensions`
- `isImageLine`, `imageFallback`, `getCapabilities`, `detectCapabilities`, `resetCapabilitiesCache`, `setCapabilities`
- `calculateImageRows`, `allocateImageId`, `deleteKittyImage`, `deleteAllKittyImages`

## Types

See source files for complete type definitions.
