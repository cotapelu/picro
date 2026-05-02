# Migration Guide

## From v0.0.1 to v1.0.0 (upcoming)

### Overview
v1.0.0 introduces new features and minor breaking changes focused on accessibility, internationalization, and image handling.

### Breaking Changes

#### Theme API
- `ThemeManager.setTheme` now returns `{ success: boolean }` instead of void.
- Theme colors are now automatically adapted to terminal capabilities. To retain original truecolor codes, ensure `trueColor` capability is set via `ThemeManager.setTerminalCapabilities(true)`.

#### Image Rendering
- `renderImage` now takes `ImageRenderOptions` with `scaleMode` supporting additional values: `contain` (alias `fit`) and `cover` (alias `fill`).
- Animated GIF support: use `renderAnimatedGif` to get a sequence of frames.

#### Component State
- Components implementing state serialization now use `serializeState`/`deserializeState`. This is opt-in; existing custom components will continue to work unchanged.

### New Features
- Accessibility: `ariaLabel`, `role`, `describe`, `textDirection`.
- RTL text support with automatic detection or explicit `textDirection='rtl'`.
- Arabic text shaping via `arabic-reshaper`.
- Color fallback system for terminals without truecolor.
- Internationalization via `i18n`.
- Layout inspector, debug overlay, memory leak detection.
- Extension API: `registerComponent`, `setExtensionHook`, `createAgentToolBridge`.
- Resource bundling for offline use.
- Custom image loader via `setCustomImageLoader`.

### Migration Steps
1. Update imports for new utilities if needed (`color-fallback`, `i18n`, `resource-bundle`, etc.).
2. If you use custom themes with 24-bit colors, call `ThemeManager.setTerminalCapabilities(trueColor, has256Color)` appropriately.
3. For image scaling, adjust `scaleMode` values if you were relying on previous behavior.
4. Test with the new benchmarks and coverage reports.
