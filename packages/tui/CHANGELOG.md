# Changelog

## Unreleased (v1.0.0)

### Added
- Full accessibility support: ARIA labels, roles, `describe()` method, and `textDirection` for RTL.
- Comprehensive internationalization (i18n) with `i18n` utility and default translations.
- Color fallback system: automatic adaptation to terminals without truecolor (256-color and 8-color fallbacks).
- Terminal image enhancements:
  - Sixel protocol support
  - Image caching and reuse
  - Progressive image loading via `fetchImageAsBase64`
  - Scaling modes: `fit`, `fill`, `stretch`, plus `contain`/`cover` aliases
  - Preloading via `preloadImage`
  - Animated GIF rendering support (`renderAnimatedGif`)
  - Custom image loader hook (`setCustomImageLoader`)
- Component state serialization (`serializeState`, `deserializeState`) for `Input`, `SelectList`, `TreeView`.
- Layout inspector overlay for debugging (`LayoutInspector`).
- Debug overlay (`DebugOverlay`) with performance metrics.
- Memory leak detection counters.
- Render throttling configurable via `setRenderInterval`.
- Extension API: `registerComponent`, `createComponent`, `setExtensionHook`.
- Agent bridge integration (`createAgentToolBridge`) for tool execution messages.
- Theme plugin system with `ThemeManager.registerPalette`.
- Widget autocomplete provider support (`addAutocompleteProvider`).
- Virtual scrolling for `TreeView`.
- Object pooling (`ObjectPool`).
- `wrapTextWithAnsi` for ANSI-aware line wrapping.
- Arabic text shaping via `arabic-reshaper`.
- Zero-width character handling in `visibleWidth`.
- New layout managers: `Flex`, `Grid`.
- New components: `TreeView`, `Table`, `Form`.
- Lifecycle hooks (`onMount`, `onUnmount`) on `TerminalUI`.
- Theme inheritance for child components.
- many other features and fixes.

### Fixed
- Various edge cases in incremental rendering (resize, width changes).
- Panel positioning with percentage dimensions.
- Cursor hide/show race conditions.
- Proper cleanup in `TerminalUI.stop()`.
- Image rendering with wide characters.

### Changed
- `ScaleMode` now includes `contain` and `cover` as aliases for `fit` and `fill`.
- Theme colors are automatically adapted based on terminal capabilities.
- `TerminalUI` now exposes metrics (`getRenderMetrics`) and component stats (`getComponentStats`).

## [0.0.1] - 2025-??-??

Initial development version.
