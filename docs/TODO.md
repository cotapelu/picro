# TODO.md – Évolution Backlog

## Đang thực hiện / Sắp tới

### Viết lại toàn bộ TUI Ink theo chuẩn pi-mono (không copy trực tiếp code)

- [ ] Viết lại `src/tui/ink/interactive-app.tsx`: điểm vào Ink, kiểm tra stdin là raw-mode TTY, fallback readline REPL khi không phải TTY
- [ ] Viết lại `src/tui/ink/App.tsx`: layout chuẩn pi-mono (header cố định đầu, messages co giãn chiếm không gian còn lại, input dock cố định đáy, statusbar ngay dưới input)
- [ ] Viết lại `src/tui/ink/components/Header.tsx`: tiêu đề ứng dụng + phím tắt chính như BuiltInHeader
- [ ] Viết lại `src/tui/ink/components/Input.tsx`: prompt `> `, con trỏ blinking `█`, chỉ component này đăng ký `useInput`, xử lý Enter/Backspace/ký tự in được
- [ ] Viết lại `src/tui/ink/components/VirtualMessageList.tsx`: follow-end scroll như ScrollView follow: "end", không đăng ký useInput, không xung đột với Input
- [ ] Viết lại `src/tui/ink/components/StatusBar.tsx`: 2 dòng như FooterComponent (dòng trên pwd dim, dòng dưới model + tokens + context + trạng thái xử lý)
- [ ] Viết lại `src/tui/ink/components/Modal.tsx`: overlay modal, định vị trung tâm, border tròn, padding
- [ ] Viết lại `src/tui/ink/components/Toast.tsx`: thông báo tạm thời, auto-remove sau duration, màu theo loại (info/success/error/warning)
- [ ] Viết lại `src/tui/ink/components/Keybindings.tsx`: hiển thị danh sách phím tắt có sẵn
- [ ] Viết lại `src/tui/ink/components/ThemeSelector.tsx`: chọn chủ đề dark/light/matrix, điều hướng ↑/↓, Enter xác nhận, Ctrl+C hủy
- [ ] Viết lại `src/tui/ink/components/SettingsSelector.tsx`: danh sách cài đặt (theme, công cụ bị tắt, nhà cung cấp mặc định, mô hình mặc định, cấp độ suy nghĩ), điều hướng, xác nhận
- [ ] Viết lại `src/tui/ink/components/ModelSelector.tsx`: tìm kiếm mô hình, danh sách theo nhà cung cấp, điều hướng, xác nhận
- [ ] Viết lại `src/tui/ink/components/SessionSelector.tsx`: chọn phiên làm việc, tìm kiếm, sắp xếp, xóa phiên
- [ ] Viết lại `src/tui/ink/components/MarkdownRenderer.tsx`: render markdown tin nhắn, hỗ trợ mã, liên kết, danh sách, bảng
- [ ] Viết lại `src/tui/ink/components/MessageList.tsx`: danh sách tin nhắn chat, phân biệt user/assistant, canh lề, padding
- [ ] Viết lại `src/tui/ink/components/FormatTokens.ts`: định dạng số token (k, M)
- [ ] Viết lại `src/tui/ink/theme.ts`: hệ thống màu (màu cơ bản, màu sáng, in đậm, mờ, nghiêng, gạch dưới, ngược, màu nền, composite helpers)
- [ ] Viết lại `src/tui/ink/test-setup.ts`: cấu hình kiểm thử môi trường Ink (mock TTY)
- [ ] Viết lại `src/tui/ink/index.ts`: xuất tất cả thành phần

### Viết lại toàn bộ Interactive Mode theo chuẩn pi-mono (không copy trực tiếp code)

- [ ] Viết lại `src/modes/interactive/interactive-controller.ts`: pure TS, xử lý lệnh slash, sự kiện runtime, API cho UI
- [ ] Viết lại `src/modes/interactive/interactive-mode.ts`: pure TS orchestrator, kết nối runtime + Ink UI, vòng lặp chính, xử lý sự kiện agent, message, tool
- [ ] Viết lại các thành phần interactive mode (component) nếu có

## Hoàn thành

- [x] Loại bỏ chế độ in/rpc, chỉ giữ chế độ TTY
- [x] Thay thế TUI tùy chỉnh bằng terminal thuần (không dùng giao diện readline)
- [x] Thêm lệnh slash `/model` kèm menu tương tác
- [x] Đảm bảo chỉ cho phép TTY (chặn chế độ pipe)
- [x] Tách chế độ TTY thành các module và thành phần (InputHandler, MenuSystem, CommandProcessor, PromptLine, OutputRenderer, ConfigManager, StatusBar)
- [x] Tạo `docs/PROJECT_STATE.md` (phiên bản đầu tiên)
- [x] Build thành công (`npm run build`)
- [x] Thêm kiểm thử đơn vị cho chế độ TTY (41 kiểm thử pass)
- [x] Sửa trình phân tích đối số CLI: xóa tùy chọn `--mode` cũ, thêm cảnh báo khi cấp độ suy nghĩ không hợp lệ
- [x] Tất cả kiểm thử pass (2308+)
- [x] Thêm lệnh `/login` (đặt khóa API)
- [x] OutputRenderer: màu sắc, markdown, thanh quay, tiến độ, khối mã
- [x] InputHandler: nhiều dòng, lịch sử, phím tắt sửa chữa, lịch sử bền vững
- [x] ConfigManager: cấu hình bền vững, đặt lại/khôi phục
- [x] Thêm lệnh `/sessions` (liệt kê, chuyển phiên)
- [x] Thêm lệnh `/settings` (xem/sửa cấu hình)
- [x] Thêm lệnh `/tools` (bật/tắt công cụ內建)
- [x] Thêm lệnh `/theme` (chuyển màu chủ đề)
- [x] Port TUI Ink từ pi-mono: viết lại tất cả thành phần (Footer, MessageList, Input, Modal, StatusBar, Toast, SessionSelector, SettingsSelector, ModelSelector, ThemeSelector)
- [x] Viết lại InteractiveController: TypeScript thuần, xử lý lệnh slash, sự kiện runtime
- [x] Viết lại InteractiveMode: TypeScript thuần điều phối, kết nối runtime + giao diện Ink
- [x] Viết interactive-app.tsx: điểm vào Ink
- [x] Cập nhật main.ts: dùng TUI Ink làm chế độ mặc định
- [x] Thêm cuộn ảo cho danh sách tin nhắn
- [x] Thêm hiển thị markdown cho tin nhắn trợ lý
- [x] Thêm phím tắt (Ctrl+K, Ctrl+P, Ctrl+L, Ctrl+C)

---

# KẾT QUẢ AUDIT TOÀN BỘ CODE (đọc hết mọi dòng)

Đã đọc: **toàn bộ pi-mono** (packages/tui/src 21k dòng + coding-agent modes/interactive 20k dòng) và **toàn bộ src/ của picro** (48k dòng, gồm 43 component TUI, 25 file core, interactive-mode, interactive-controller, App).

## A. BUG ĐÃ XÁC MINH (phải fix)

### A1. `src/tui/ink/components/MessageInput.tsx` — ô nhập chỉ 1 dòng, không có lịch sử/đa dòng
- **Bằng chứng:** dùng `TextInput` (một dòng) thay vì `Editor`; hint ghi "gõ nhiều dòng" nhưng `submit()` chỉ gửi `value` một dòng. Không có `addToHistory`, không có kill-ring, không có autocomplete, không có Shift+Enter.
- **pi-mono:** `CustomEditor extends Editor` — `lines[]/cursorLine/cursorCol`, `navigateHistory`, `killRing`, `undoStack`, `paste marker`, autocomplete menu.
- **Fix:** MessageInput dùng `Editor` (đã port) + nối lịch sử từ controller + slash-command autocomplete.

### A2. `src/tui/ink/App.tsx` — không có modal/selector nào được render
- **Bằng chứng:** `App.tsx` render `<Modal />` **không truyền prop `modal`** (dòng 138) → `modal.type` undefined → luôn return null. 15 selector (Model/Session/Settings/Login/Theme/Tree…) tồn tại nhưng **không component nào gọi**.
- **pi-mono:** `showSelector()` thay component trong `editorContainer`, `showOverlay()` cho overlay.
- **Fix:** App quản lý `overlay` state, render selector thật thay cho editor; controller mở/đóng selector qua callback.

### A3. `src/tui/ink/App.tsx` — cuộn theo **số tin nhắn** thay vì theo **dòng hiển thị**
- **Bằng chứng:** `maxScroll = messages.length - viewportHeight`, `handleScroll` bước 1 = 1 **tin nhắn**. Một tin nhắn dài 50 dòng làm scroll nhảy qua toàn bộ. Không có follow-end, không có scrollbar, không có `page`.
- **pi-mono:** `ScrollView(follow:"end")` + `scrollBy(lines)` + scrollbar geometry.
- **Fix:** dùng `ScrollView` (đã port) trên danh sách **dòng đã render**, PageUp/PageDown, follow-end khi tin nhắn mới.

### A4. `src/tui/ink/App.tsx` — `viewportHeight` tính một lần, không cập nhật khi terminal resize
- **Bằng chứng:** `useMemo(..., [])` dòng 55-57 → `process.stdout.rows` đọc đúng 1 lần. `useWindowSize` không dùng cho transcript.
- **Fix:** `useWindowSize()` + recompute, `ScrollView.updateLayout` theo chiều cao mới.

### A5. `src/modes/interactive/interactive-controller.ts` — slash command bị gửi tới LLM như tin nhắn thường
- **Bằng chứng:** `sendMessage(text)` → `runtime.prompt(text)` trực tiếp. `runCommand()` có implementation đầy đủ (quit/thinking/model/compact/sessions/copy/theme/tools...) **nhưng không ai gọi**.
- **pi-mono:** `setupEditorSubmitHandler()` parse `text === "/settings"`, `text.startsWith("/model ")`…; phần còn lại (extension command) mới `session.prompt(text)`.
- **Fix:** `sendMessage` route: slash command → `runCommand`; `!cmd` → bash; còn lại → `runtime.prompt`.

### A6. `src/modes/interactive/interactive-controller.ts` — `thinking` modal hiện **model** thay vì thinking level
- **Bằng chứng:** `props: { current: this.status.model, ... }` dòng ~330. `status.model` là chuỗi model id.
- **Fix:** lấy `runtime.getThinkingLevel?.()` / `settings.getDefaultThinkingLevel?.()`.

### A7. `src/modes/interactive/interactive-controller.ts` — `applyTheme()` ghi ANSI thô ra stdout, phá layout Ink
- **Bằng chứng:** `process.stdout.write("\x1b[40m\x1b[37m")` — không có reset, không đi qua Ink render, desync màn hình. Theme "matrix" = `\x1b[42m\x1b[32m` (nền xanh, chữ xanh → vô hình).
- **pi-mono:** `ThemeController.setThemeName()` → `setThemeInstance(new Theme(json))` → component rebuild.
- **Fix:** gọi hệ thống theme thật (`setTheme`/`loadBuiltinTheme`) và publish render.

### A8. `src/modes/interactive/interactive-controller.ts` — không có streaming: `message_update` bị bỏ qua
- **Bằng chứng:** `subscribeToSession` chỉ xử lý `agent_start/agent_end/message_start/message_end/error`. `message_update` (streaming token) không có case → tin nhắn trợ lý chỉ xuất hiện **trọn vẹn ở cuối**, không có khối thinking, không có tool call.
- **pi-mono:** `message_update` → `streamingComponent.updateContent(...)` + `ToolExecutionComponent` theo `pendingTools` map.
- **Fix:** controller giữ message đang stream, emit event đủ cho App render incremental.

### A9. `src/modes/interactive/interactive-controller.ts` — không hiển thị tool execution
- Không `tool_execution_start/update/end` trong switch. Picro đã có `ToolExecution.tsx` (port đầy đủ) nhưng không ai dùng.

### A10. `src/modes/interactive/interactive-controller.ts` — resume session hiện transcript rỗng
- **Bằng chứng:** `this.messages = []` và không đọc `session.state.messages`/`buildContextEntries()` khi khởi tạo.
- **pi-mono:** `renderInitialMessages()` → `renderSessionEntries()`.
- **Fix:** nạp tin nhắn phiên hiện tại vào transcript khi init và sau `switchSession/newSession`.

### A11. `src/tui/ink/components/Editor.tsx` — `handlePaste` marker không đăng ký đúng
- **Bằng chứng:** với paste lớn, `insertCharacter(marker)` được gọi sau khi `pushUndo`, nhưng `insertCharacter` lại `pushUndo` lần nữa (do `lastAction.current !== "type-word"`) → 2 snapshot. marker cũng không được thêm vào `pastes` map ở đây (chỉ `pastesRef` set trước) — thực ra có set, nhưng `submit()` duyệt `pastesRef.current` nên OK. Vấn đề thực: marker bị chèn **giữa** undo state gây lệch.
- **pi-mono:** `handlePaste` → `insertTextAtCursorInternal(marker)` (atomic, không pushUndo lặp).
- **Fix:** dùng `insertTextAtCursorInternal` tương đương.

### A12. `src/tui/ink/components/Editor.tsx` — paste lớn không "prepend space" khi dán đường dẫn
- **pi-mono:** `if (/^[/~.]/.test(filteredText) && /\w/.test(charBeforeCursor)) filteredText = ' ' + filteredText`.
- Picro thiếu → dán path dính vào chữ.

### A13. `src/tui/ink/components/Editor.tsx` — thiếu phím `deleteCharForward`, `cursorWordLeft/Right`, `pageUp/pageDown`, `jumpForward/Backward`
- **Bằng chứng:** `useInput` chỉ nhận `tui.input.submit/newLine/editor.deleteCharBackward/deleteToLineStart/deleteToLineEnd/deleteWordBackward/yank/yankPop/undo/historyPrevious/historyNext/cursorUp/cursorDown/cursorLeft/cursorRight/cursorLineStart/cursorLineEnd`.
- **TUI_KEYBINDINGS khai báo** đủ 30 phím nhưng handler chỉ map ~16. Ctrl+Left/Right (word nav), Delete, PageUp/Down, Ctrl+] (jump) chết.
- **Fix:** map đầy đủ theo `TUI_KEYBINDINGS`.

### A14. `src/tui/ink/components/Editor.tsx` — `MAX_VISIBLE` hardcode 24 rows
- `Math.floor(24 * 0.3)` thay vì `terminal.rows`. Terminal cao → editor chỉ hiện 7 dòng dù có chỗ.
- **pi-mono:** `Math.max(5, Math.floor(this.tui.terminal.rows * 0.3))`.

### A15. `src/tui/ink/components/Editor.tsx` — paste multi-line trong `handlePaste` không undo atomic
- nhánh `lines.length > 1` set state trực tiếp sau `pushUndo(current)`, không `pushUndo` lại — tình cờ đúng, nhưng nhánh single-line có `setLines` mặc định `undo:false` → single-line paste không undo được. pi-mono `insertTextAtCursorInternal` luôn atomic.

### A16. `src/tui/ink/components/TextInput.tsx` — `key.delete` và Backspace dùng chung nhánh (đã fix 1 lần nhưng chưa đủ)
- Đã có `removeGrapheme(..., key.delete ? "forward":"backward")` — **nhưng** Ink đôi khi báo `key.delete` cho phím Backspace trên một số terminal (Windows). Cần guard theo `input` sequence: `\x1b[3~` = delete, `\x7f` = backspace.

### A17. `src/tui/ink/components/TextInput.tsx` — `AVAILABLE = 60` hardcode, prop `width` bị bỏ qua
- Comment ghi "chỉ để tương thích API". Terminal 200 cột → input vùng nhìn 60 cột.
- **pi-mono `Input.render`:** `availableWidth = width - visibleWidth(prompt)`.

### A18. `src/tui/ink/components/TextInput.tsx` — thiếu `deleteToLineStart/End`, `cursorLineStart/End`, `word nav`, `undo`, `paste marker`
- Chỉ có ctrl+u/k/a/e. Còn lại không có.

### A19. `src/tui/ink/components/SelectList.tsx` — `start` clamp sai khi list ngắn hơn maxVisible
- `Math.min(selected - floor(max/2), items.length - maxVisible)` — với `items.length=3, maxVisible=8` → `3-8 = -5`, `Math.max(0, -5)=0`. Ở đây OK. Nhưng `primaryColumnWidth(items, totalWidth)` **không dùng** `totalWidth`, và `columnWidth` có thể > width → description tràn.
- Hơn nữa: `descStart = prefix.length + columnWidth` dùng `prefix.length` (2 ký tự "→ " đã tô màu → chuỗi ANSI dài ~10). Pi-mono dùng `visibleWidth(prefix)`.
- **Bằng chứng lỗi đo:** `prefix = fg("accent","→ ")` là chuỗi ~13 ký tự; `prefix.length` = 13 → `descWidth = width - 13 - 2` sai ~11 cột.

### A20. `src/tui/ink/components/StatusBar.tsx` — tokens `"0/0"` parse sai
- `formatTokens(Number("0/0") || 0)` → `Number("0/0")` = NaN → `|| 0` → 0. Đúng nhưng vô nghĩa: pi-mono hiện `↑12k ↓3k R8k CH95%` từ usage totals thật.
- Thiếu hoàn toàn: output tokens, cacheRead/Write, cache hit rate, context %/window, git branch, session name, cost.
- **pi-mono FooterComponent:** tính `usageTotals` từ entries, `contextUsage`, `latestCacheHitRate`.

### A21. `src/tui/ink/components/StatusBar.tsx` — `modelName` không truncate trước khi tính gap
- `composeStatusBarLine` cắt `right` theo `available` nhưng `pwdLine` dùng `columns`; nếu model name dài > còn lại → `gap = max(2, ...)` vẫn đúng. OK. Nhưng `formatTokens(Number(tokenTotal))` với `tokenTotal = "0/0"` → hiện `↑0`. Cần sửa để nhận số.

### A22. `src/tui/ink/components/Footer.tsx` — hiển thị model từ **settings default** thay vì session model
- `runtime.settings.getDefaultProvider()/getDefaultModel()` → luôn hiển thị default, không phải model đang chạy (có thể đã cycle).
- Không subscribe event, chỉ `setInterval(2000)`.

### A23. `src/tui/ink/components/Modal.tsx` — không bao giờ hiển thị được (xem A2), và không focus/nhập được
- Không có `useInput`, không có navigation, `Ctrl+C hoặc /help để đóng` là text tĩnh.

### A24. `src/tui/ink/components/HStack.tsx` — `visualWidth` chỉ bỏ SGR `\x1b[...m`, không bỏ OSC/APC
- Dùng `line.replace(/\x1b\[[0-9;]*m/g,"")` — hyperlink OSC8, cursor marker APC, image escape đều bị đo sai.

### A25. `src/tui/ink/components/HStack.tsx` — `composite()` cắt theo `plainBase.length` thay vì cột hiển thị
- `before = plainBase.slice(0, col)` — với chuỗi chứa wide char/emoji, slice theo UTF-16 unit ≠ cột hiển thị → lệch cột.
- **pi-mono:** `compositeTuiLine` + `sliceByColumn`.

### A26. `src/tui/ink/components/Box.tsx` — chỉ render text, không render component con
- `flatten(node)` chỉ lấy `children` string; nếu con là component phức tạp (Box lồng Box, Text + icon) → mất nội dung.

### A27. `src/tui/ink/components/Spacer.tsx` / `ThemedText.tsx` — dùng `<Text>` chứa `{"\n"}` nhiều lần
- Ink collapse whitespace/merge; không đảm bảo đúng số dòng trống. pi-mono trả mảng `string[]`.
- `ThemedText` không truyền được `width`, không pad.

### A28. `src/tui/ink/components/CancellableLoader.tsx` — `cancelLast` gán lên function object (rò rỉ toàn cục)
- `(CancellableLoader as ...).cancelLast = ...` — ghi thuộc tính lên **chính function component**, dùng chung cho mọi instance. Không có cleanup khi unmount.
- `dispose()` không tồn tại (pi-mono có).

### A29. `src/tui/ink/components/MouseRegion.tsx` — `lastHandler` gán lên function component
- Cùng lỗi pattern A28: nhiều instance ghi đè lẫn nhau.

### A30. `src/tui/ink/components/RadiusLoginSelector.tsx` — `useMemo` để tạo side-effect animation
- Dùng `useMemo` thay vì `useEffect` cho `startBrandAnimation` → không cleanup đúng, chạy lại không như ý. React cảnh báo.

### A31. `src/tui/ink/components/BashExecution.tsx` — NUL byte trong source (file hỏng)
- Offset 3621 chứa byte 0x00 và 0x1F trong regex `/[ -]/g` (phải là `/[\x00-\x1f]/g`). `file` báo "data" không phải text. TS vẫn compile được vì nằm trong char class nhưng đây là lỗi dữ liệu.

### A32. `src/tui/ink/components/BashExecution.tsx` — `createBashExecutionHandle` không dùng, và trùng logic `append` với component state
- Component giữ `outputLines` state nội bộ; handle bên ngoài không thể đẩy chunk vào được (không ref). Streaming bash execution không thể hiện output live.

### A33. `src/tui/ink/components/visual-truncate.ts` — `VisualLinePreview` cache không có `text` khi đổi
- `options` được giữ nguyên; `ToolExecution` mutate trực tiếp `(preview as any).options.text = outputText` — workaround hack, thiếu API `setText()`.

### A34. `src/tui/ink/components/markdown-layout.ts` `clipMarkdownLine` — escape swallow vòng lặch vô hạn khi không tìm thấy "m"
- `while (j < line.length && line[j] !== "m") j++;` — nếu escape là OSC (bắt đầu `\x1b]`), không có "m" → ăn tới hết dòng. Đúng ra phải nhận diện cả OSC/APC.
- Đây là bug thật: markdown có hyperlink OSC8 → clip cắt sai.

### A35. `src/tui/ink/components/status-bar-layout.ts` `truncateVisual` — tương tự, escape swallow chỉ tìm "m"

### A36. `src/tui/ink/components/markdown-transform.ts` / `MarkdownRenderer` — không có LaTeX
- `MarkdownRenderer` không import `renderLatex` (core có `Latex.ts` 665 dòng + test). Inline `$...$` và block `$$...$$` render thành chữ thô.
- **pi-mono Markdown:** tokenizer extension `latex`/`latexBlock` → `renderLatex()`.

### A37. `src/tui/ink/components/MarkdownRenderer.tsx` — không có bảng (table)
- `parseBlocks` bỏ qua hoàn toàn `| a | b |` GFM table. pi-mono render bảng với border `┌─┬─┐`.

### A38. `src/tui/ink/components/MarkdownRenderer.tsx` — `styleInline` regex dễ hỏng
- `\[([^\]]+)\]\(([^)]+)\)` bỏ URL (chỉ giữ text) — link không có đích; nested `*` trong `**`; `[^`]` không match escape.

### A39. `src/tui/ink/components/Armin.tsx` — `{void version}` trong JSX là no-op
- Dòng cuối `<Text>...{void version}</Text>` — không render gì, animation có thể không re-render. Dùng state sai cách (state không đọc).

### A40. `src/tui/ink/components/Armin.tsx` — `state.current = s` gán mỗi lần render
- Block render body (`{ const s: EffectState = {}; ... state.current = s; }`) chạy mỗi render → reset effect state mỗi frame → hiệu ứng không tiến triển (trừ khi React giữ ref). Thực tế `state` là ref nên gán lại mỗi render sẽ **reset animation loop**.

### A41. `src/tui/ink/components/ToolExecution.tsx` — `preview` mutate qua `as unknown as`
- `(preview as unknown as { options: { text: string } }).options.text = outputText` — private field của class, không kiểm soát được, dễ vỡ.

### A42. `src/tui/ink/components/ToolExecution.tsx` — durationMs hiện khi `!isPartial` kể cả `executionStarted=false`
- Điều kiện `!isPartial && executionStarted` nhưng `durationMs` có thể undefined → render `(...)` rỗng khi không có duration.

### A43. `src/tui/ink/components/AltScreenSearch.tsx` — `searchCorpus` quét toàn bộ spans cho mọi match
- Không dùng `spanIndex` tiến thuận như pi-mono → O(n·m). Session dài sẽ lag.

### A44. `src/tui/ink/core/Colors.ts` — `parseColor` thiếu `okhsl` khi `l`/`s` là phần trăm
- `OKHSL_PATTERN` cho phép `%` ở group 2 (hue%) nhưng `okhslColor(hue,sat,l)` nhận 0..1; group 4/6 (sat%, light%) được xử lý đúng. **Nhưng** group 2 là `hue%` không hợp lệ trong CSS (hue dùng deg) — pattern chấp nhận nó và bỏ qua → hue sai. Cần loại bỏ `%` cho hue.

### A45. `src/tui/ink/core/Colors.ts` — `blend` trong system-theme dùng hex round-trip
- `colorToHex` → `parseColor` → rgb → channel mix. Đúng nhưng mất alpha/channel ngoài gamut. Chấp nhận được.

### A46. `src/tui/ink/core/select-window.ts` — `Math.min(Math.floor(selected) || 0, length-1)` 
- `selected = NaN` → `NaN || 0` = 0 ✓. `selected = -1` → `-1 || 0` = -1 → `Math.min(-1, len-1)` = -1 → `Math.max(0,-1)`=0 ✓. OK.

### A47. `src/tui/ink/core/Keys.ts` — `matchesKey` không có `shift+space`, `super+*`, `isKeyRelease/isKeyRepeat`
- pi-mono export `isKeyRelease`, `isKeyRepeat`, `decodePrintableKey` (kitty+modifyOtherKeys). Picro chỉ có `decodeKittyPrintable`. Editor/Input của picro không decode được `modifyOtherKeys` printable → trên terminal không Kitty, ký tự đặc biệt (F13+, keypad) không vào được.
- Thiếu `Key.*` đầy đủ: `backtick/hyphen/equals/...` và các combined modifiers.

### A48. `src/tui/ink/core/Keys.ts` — `parseKey` không nhận diện `\x1b\x1b` variants, `ctrl+alt+[`, `alt+space`
- `if (data === "\x1b ") return` không có. `alt+left` non-kitty `\x1bB`/`\x1bF` không có.

### A49. `src/tui/ink/core/TerminalText.ts` — `ansiCodeLength` chỉ nhận `m/G/K/H/J` cho CSI
- pi-mono cũng vậy, nhưng picro **thiếu** nhận diện `\x1b[?...u` (kitty flags) — sequence đó xuất hiện trong `stripTerminalSequences`/`visibleWidth` khi đọc reply. Thực ra OK vì không phải output.
- **Thiếu nghiêm trọng:** `visibleWidth` không có fast-path ASCII như pi-mono (`asciiVisibleWidth`) → mỗi dòng markdown/style đều chạy segmenter + regex. Footer 30fps sẽ lag.

### A50. `src/tui/ink/core/TerminalText.ts` — `graphemeWidth` dùng bảng wide tự viết, sai một số dải
- pi-mono dùng thư viện `get-east-asian-width` + xử lý `terminalSpacingMarkRegex`, `followsMark` cho Indic/Thai/Lao. Picro chỉ có range thô → sai width cho အသင့်, षि, ẖṭ… → layout lệch cột.

### A51. `src/tui/ink/core/TerminalText.ts` — `truncateToWidth` không tracking hyperlink
- pi-mono `finalizeTruncatedResult` đóng OSC8 (`getActiveOsc8Close`) trước khi thêm ellipsis. Picro không → link bị cắt giữa chừng để lại OSC8 mở, màu loang ra padding.

### A52. `src/tui/ink/core/TerminalText.ts` — `wrapTextWithAnsi` không tracking SGR xuyên dòng
- pi-mono `AnsiCodeTracker` lưu bold/italic/fg/bg/hyperlink và **mở lại** ở đầu dòng sau. Picro `wrapSingleLine` chỉ giữ `pendingAnsi` trong token, không reopen active codes → dòng 2 của đoạn markdown đậm mất định dạng.

### A53. `src/tui/ink/core/Latex.ts` — `MARKER_START = "\u00ad0"` dùng ký tự tiếng Latin-1 Supplement
- pi-mono dùng private-use `\u{f0000}`. `\u00ad` (soft hyphen) là ký tự **hiển thị được/độc lập** trong một số terminal và có thể xuất hiện trong input thật → va vào marker, phá layout.
- **Đây là bug thật, có thể tái hiễn:** nhập `$a\u00ad0b$` → parser hiểu nhầm là layout node index 0.

### A54. `src/tui/ink/core/StdinBuffer.ts` — `isCompleteCsi` dừng ở byte 0x40..0x7e nhưng bỏ sót `\x1b[?...u`
- `\x1b[?7u` có final byte 'u' (0x75) nằm trong 0x40..0x7e → complete ✓. Nhưng `\x1b[?u` (query) cũng 'u' → tách đúng. OK.
- **Thiếu:** `parseUnmodifiedKittyPrintable` chỉ match `^\x1b\[(\d+)(?::\d*)?(?::\d+)?u$` — thiếu `;mod` group → sequence có modifier (shift+a) không match → duplicate char. pi-mono regex đầy đủ `(?:;(\d+))?(?::(\d+))?u$`.

### A55. `src/tui/ink/core/Fuzzy.ts` — không có `getWordSegmenter` options (không dùng được cho paste marker)
- Thiếu `WordNavigationOptions` như pi-mono (`isAtomicSegment`) → ctrl+W xóa làm đứt `[paste #1 ...]`.

### A56. `src/tui/ink/core/TerminalImage.ts` — `getJpegDimensions` `marker >= 0xc0 && <= 0xc2`
- Thiếu `0xc3` (SOF3 lossless), `0xc5-0xc7`, `0xc9-0xcb`, `0xcd-0xcf` mà pi-mono cũng chỉ c0..c2. Giữ parity. OK.
- **Thiếu:** `getKittyImageMetadata`, `getKittyImagePlacement`, `cropKittyImageLine`, `calculateImageCellSize(..., optimizeAspectRatio)`, `setCellDimensions` query CSI 16 t.

### A57. `src/tui/ink/core/TerminalImage.ts` — `capabilityOverrides` dồn vào `cachedCapabilities` nhưng `resetCapabilitiesCache` không export

### A58. `src/tui/ink/interactive-app.tsx` — `startFallbackRepl` không xử lý lỗi, không đợi sendMessage xong
- `rl.on("line", async ...)` → `void` lỗi không bắt. `controller.onMessage` in `last.content` — content có thể array.

### A59. `src/tui/ink/interactive-app.tsx` — không gọi `mode.stop()`/`terminal.stop()` khi Ink unmount
- `render()` không có `onUnmount` → SIGTERM handler của `InteractiveMode` không chạy, terminal rời raw mode không đúng cách (con trỏ nhấp nháy, paste marker còn bật).

### A60. `src/main.ts` — `[DEBUG]` console.log chạy ở môi trường production
- 6 dòng `console.log('[DEBUG]...')` không điều kiện → nhiễu stdout, phá layout TUI (Ink render lẫn log).
- **Bằng chứng:** `subscribeToSessionEvents` dòng 38-65.

### A61. `src/main.ts` — `startInteractiveApp` không `await`, không dispose runtime khi exit
- `main()` return ngay sau `startInteractiveApp(...)` → `printTimings()` chạy, `runtime.dispose()` không bao giờ gọi (chỉ có trong shutdown handler).

### A62. `src/modes/interactive/interactive-mode.ts` — `getUserInput()` đặt lại `onInputCallback` nhưng không xử lý pending khi shutdown
- `handleCtrlC()` gọi `shutdown()` nhưng promise `getUserInput` chưa resolve → process.exit trong `shutdown()` nên OK. Tuy nhiên `stop()` không `process.stdin.pause()` sau khi `terminal.stop()` → Ctrl+D còn trong buffer đọc lại sau khi raw mode tắt (pi-mono có comment chính xác về race này).

### A63. `src/modes/interactive/interactive-mode.ts` — `handleCtrlC` không clear editor
- pi-mono: `handleCtrlC()` → lần 1 `clearEditor()`, lần 2 `shutdown()`. Picro chỉ publish render, không clear gì → nhấn Ctrl+C lần 1 không có phản hồi trực quan.

### A64. `src/modes/interactive/interactive-mode.ts` — không có Ctrl+D (exit khi editor rỗng), Ctrl+Z (suspend), Ctrl+P/Ctrl+N (cycle model)
- pi-mono `handleCtrlD`, `handleCtrlZ`, `cycleModel`.

### A65. `src/tui/ink/core/ProgramStatusReporter.ts` — `report()` không app "picro" khi `blocked`
- `currentStatus()` trả `{state:"blocked", ...blocked}` rồi `report()` thêm `app` — OK. Nhưng `report()` không set `message: getSessionName()` cho `blocked`. pi-mono cũng vậy. OK.

### A66. `src/tui/ink/core/Terminal.ts` — `refreshDimensions` gọi `SIGWINCH` cho chính mình mỗi `start()`
- Trên Linux/Mac `kill(pid, SIGWINCH)` là hợp lệ, nhưng nếu không có listener resize (Ink mode) thì không có gì xảy ra → tiếng. Nên kiểm tra `process.stdout.listenerCount('resize')`.

### A67. `src/tui/ink/core/Terminal.ts` — `drainInput` không tắt kitty flags như pi-mono
- pi-mono ghi `\x1b[<u` trước khi drain; picro có ghi nhưng **không** set `keyboardProtocolPushed=false` sau restart → `stop()` ghi lại lần nữa (double disable, vô hại nhưng sai state).

### A68. `src/tui/ink/core/Terminal.ts` — không có `enableWindowsVTInput`
- Windows Terminal: Shift+Tab đến dạng `\t` thường. pi-mono gọi native helper.

### A69. `src/tui/ink/core/Terminal.ts` — `forwardInput` không normalize native Shift+Enter
- pi-mono: `normalizeNativeShiftEnterInput` với `isNativeModifierPressed("shift")` cho Apple Terminal/Win. Picro convert vô điều kiện `\r`/`\x1b\r` → NATIVE_SHIFT_ENTER khi Apple Terminal → **phá Enter thường** trên Apple Terminal vì luôn coi là shift+enter.
- **Bằng chứng:** điều kiện chỉ `isAppleTerminal()`, thiếu `isShiftPressed`.

### A70. `src/tui/ink/core/TerminalImage.ts` — không có `probeTmuxHyperlinks`
- tmux: picro luôn `hyperlinks:false` (an toàn), pi-mono chủ động probe. Chấp nhận được nhưng thiếu.

### A71. `src/tui/ink/components/UserMessage.tsx` — OSC133 markers nằm trong `<Box paddingX>`
- `<Box>{OSC133_START}{pad}{bg}</Box>` — Box render chuỗi đó một mình; OSC133 phải ở đầu **dòng render** để terminal nhận diện prompt. Ink `<Box>` không đảm bảo. Và `OSC133_END`+`OSC133_FINAL` cùng 1 dòng.

## B. TÍNH NĂNG CÒN THIẾU SO VỚI pi-mono (phải viết thêm)

- [ ] **B1. Autocomplete slash-command + @file trong editor** (`CombinedAutocompleteProvider` đã port nhưng không gắn vào Editor; cần `fd` hoặc fallback readdir)
- [ ] **B2. Bash mode `!cmd` / `!!cmd`** trong editor (đổi border color, `isBashMode`, execute + `BashExecution` component live output)
- [ ] **B3. Message queue (steering/follow-up)** — `updatePendingMessagesDisplay`, `restoreQueuedMessagesToEditor`, Alt+Enter
- [ ] **B4. Auto-compaction status + Esc abort** (`CompactionStatusIndicator`, `autoCompactionEscapeHandler`)
- [ ] **B5. Auto-retry status + Esc abort** (`RetryStatusIndicator` với countdown)
- [ ] **B6. Tool output expansion Ctrl+T** (`setToolsExpanded` → tất cả `ExpandableText.setExpanded`)
- [ ] **B7. Thinking block toggle** (`hideThinkingBlock`, `setHiddenThinkingLabel`)
- [ ] **B8. External editor Ctrl+G** (`editInExternalEditor` — component viết nhưng App không nhận phím)
- [ ] **B9. Clipboard paste Ctrl+V** (files/images/text → `insertTextAtCursor`)
- [ ] **B10. Model cycling Ctrl+P/Ctrl+N** + status "Switched to X"
- [ ] **B11. Thinking cycling** (`cycleThinkingLevel`)
- [ ] **B12. Session tree selector `/tree`** (`TreeSelector` đã port đầy đủ — không gọi)
- [ ] **B13. `/settings` selector thật** (SettingsList đã port — 40 settings như pi-mono)
- [ ] **B14. `/model` selector + `/scoped-models`** (đã port — không gọi)
- [ ] **B15. `/resume` SessionSelector** (đã port — không gọi)
- [ ] **B16. `/fork` UserMessageSelector** (đã port)
- [ ] **B17. `/trust` TrustSelector** (đã port)
- [ ] **B18. `/login`, `/logout`** (OAuthSelector + LoginDialog đã port)
- [ ] **B19. `/export`, `/import`** (chưa có session export/import runtime)
- [ ] **B20. `/changelog`, `/name`, `/session`, `/hotkeys`, `/debug`, `/bug`, `/compact`, `/reload`, `/share`, `/clone`**
- [ ] **B21. Header động: logo + version + key hints (compact/expanded), onboarding text**
- [ ] **B22. Loaded resources listing** (skills/extensions/prompts/themes/context files grouped by scope)
- [ ] **B23. Changelog notice khi update**
- [ ] **B24. Cache miss / cache warming notices**
- [ ] **B25. Terminal color query (OSC 10/11/4) + system theme auto-sync + scheme notifications**
- [ ] **B26. Fullscreen alt-screen mode** (`TuiAltScreen`: mouse, text selection, scrollbar, search Ctrl+Shift+F, OSC133 prompt nav)
- [ ] **B27. Footer đầy đủ: ↑input ↓output R/W cache, CH%, context %/window, cost, git branch, session name, model → routed model**
- [ ] **B28. Image inline trong tool result** (`Image` đã port — cần `showImages` setting + `setCellDimensions`)
- [ ] **B29. Markdown: bảng, LaTeX, strikethrough nghiêm ngặt, HTML comment, list nesting/ordered markers**
- [ ] **B30. LaTeX layout 2D (fraction/script/matrix) đúng private-use markers**
- [ ] **B31. `visibleWidth` fast-path ASCII + East Asian Width đầy đủ**
- [ ] **B32. `wrapTextWithAnsi` SGR/hyperlink tracking xuyên dòng**
- [ ] **B33. `isKeyRelease/isKeyRepeat/decodePrintableKey` cho editor**
- [ ] **B34. Keybindings settings thật (đọc từ settings, conflict detection UI)**

## C. THỨ TỰ THỰC HIỆN

1. **Sửa bug nền TUI** (A31, A34, A35, A47, A49, A51, A52, A53, A54, A55, A69) — ảnh hưởng mọi render
2. **Sửa bug interactive** (A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, A58–A64) — đây là phần "rất sơ sài" cần nâng cấp
3. **Fix component bugs** (A11–A30, A32, A33, A36–A45)
4. **Viết tính năng thiếu** (B1–B34) theo thứ tự ưu tiên: editor/autocomplete → slash commands + selectors → streaming/tool rendering → footer/header → markdown/latex → fullscreen

## ĐÃ FIX (các commit gần nhất)

### Giai đoạn 1 - Nền TUI (core)
- [x] A31 `BashExecution.tsx` chứa byte NUL/0x1F trong regex char class (file bị coi là binary)
- [x] A34/A35 `clipMarkdownLine`/`truncateVisual` nuốt escape chỉ tìm "m" → hyperlink OSC8 làm mất phần còn lại của dòng; nay nhận SGR/OSC/APC và giữ escape đuôi
- [x] A54 `StdinBuffer` regex kitty printable thiếu group modifier → ký tự có modifier bị nuốt rồi chèn lại 2 lần
- [x] A69 `Terminal.forwardInput` đổi MỌI `\r` thành Shift+Enter trên Apple Terminal → Enter thường không gửi được; nay kiểm tra Shift thật sự đang nhấn
- [x] A47 `Keys.ts`: thêm isKeyRelease/isKeyRepeat/decodePrintableKey, `Key.*` đầy đủ, logical shifted-symbol cho matchesKitty/parseKey
- [x] A53 `Latex.ts` dùng soft hyphen U+00AD (ký tự người dùng gõ được) làm layout marker → phá bố cục 2D; chuyển sang private-use + PROTECTED_SPACE không bị trim
- [x] A51/A52 `TerminalText`: tracker SGR/hyperlink để wrap mở lại style xuyên dòng; đóng OSC8 trước ellipsis; fast-path ASCII cho visibleWidth; tính terminal-spacing mark (Indic/Thai/Lào) không lệch cột

### Giai đoạn 2 - Component TUI
- [x] A1/A13/A14/A15/A12 `Editor.tsx`: đủ keybinding (deleteCharForward, deleteWordForward, cursorWordLeft/Right, pageUp/Down, jump), MAX_VISIBLE theo terminal rows, paste atomic + prepend space, xóa paste marker đánh số lại registry
- [x] A16/A17/A18 `TextInput.tsx`: đủ bộ phím soạn thảo (undo, kill ring, word nav, bracketed paste, CSI-u), cửa sổ ngang theo width prop, Delete/Backspace phân biệt
- [x] A19/A24/A25/A26 `HStack.tsx` đo bằng visibleWidth và ghép theo cột hiển thị; `Box.tsx` render được node con; 
- [x] A27 `Spacer`/`ThemedText` mỗi dòng trống là một node riêng
- [x] A28/A29/A30 `CancellableLoader`/`MouseRegion` dùng handle per-instance (không ghi state lên function component); `RadiusLoginSelector` dùng useEffect
- [x] A39/A40/A41 `Armin.tsx` khởi tạo hiệu ứng một lần (không reset mỗi frame), bỏ `{void version}` no-op

### Giai đoạn 3 - Interactive mode + App
- [x] A1 `MessageInput` dùng Editor đa dòng (thay TextInput 1 dòng), forward ref cho controller
- [x] A2/A23 `App.tsx` render overlay/selector thật (model/session/settings/theme/thinking/help) thay cho editor, đúng mô hình showSelector của pi-mono
- [x] A3/A4 App cuộn theo dùng ScrollView + follow-end, đo lại theo terminal resize
- [x] A5 `sendMessage` định tuyến: /command chạy nội bộ, !/!! chạy bash, chỉ prompt thường tới LLM
- [x] A6 `/thinking` mở selector với CẤP ĐỘ SUY NGHĶ đúng (trước đó hiện model id)
- [x] A7 `/theme` áp qua Theme class (trước đó ghi ANSI thô ra stdout, desync màn hình)
- [x] A8/A9 streaming message_update cập nhật message tại chỗ; tool_execution_* hiện trong transcript
- [x] A10 nạp transcript của phiên khi khởi tạo và sau khi chuyển phiên
- [x] A58/A59/A61 readline fallback await + báo lỗi + chỉ in message mới; Ink unmount stop terminal; main.ts bỏ [DEBUG] log vô điều kiện; dispose runtime khi exit
- [x] A62/A63/A64 Ctrl+C xóa ô nhập (lần đầu), Ctrl+D chỉ thoát khi rỗng, Ctrl+Z suspend, stop() pause stdin
- [x] A20/A22 StatusBar parse token thật; model/context đọc từ phiên đang chạy

### Giai đoạn 4 - Session/tools/CLI
- [x] `SessionManager.importSession` chỉ nhận JSON object → MỌI import file .jsonl thật đều fail; nay nhận JSONL và ghi thành phiên lưu được
- [x] `_hashPassword` treo vô hạn với password rỗng (`min(32-len, len)` = 0 phần tử)
- [x] bash-executor: truncate giữ ĐẦU thay vì ĐUỐI (mất error/exit status/kết quả); giờ giữ tail + cắt theo bytes
- [x] `validatePathWithinBase` prefix `base + '/'` sai trên Windows và khi base là gốc; dùng path.relative
- [x] `sanitizeBinaryOutput` không lọc DEL (0x7F) và dải C1 (0x80-0x9F)
- [x] `--port` nhận NaN/out-of-range → listen(NaN); nay validate + cảnh báo
- [x] main.ts dùng `resolveCliModel` (provider/id:thinking, alias) thay vì registry.find trần

### Giai đoạn 5 - Markdown/footer
- [x] A36-A38 MarkdownRenderer: bảng GFM (trước đó mọi pipe table hiện như đoạn thô), LaTeX inline $...$, link giữ URL đích

## CÒN LẠI (ưu tiên giảm dần)

- [ ] B1 Autocomplete menu trong editor (CombinedAutocompleteProvider đã port, chưa gắn menu overlay)
- [ ] B3 Message queue steer/follow-up hiển thị trong dock + Alt+Enter
- [ ] B6 Ctrl+T mở rộng tool output; B7 toggle thinking block; B8 Ctrl+G external editor; B9 Ctrl+V clipboard
- [ ] B10/B11 cycling model (Ctrl+P) và thinking level
- [ ] B12-B18 selector /tree, /fork, /trust, /login, /logout (component đã port)
- [ ] B19-B20 /export, /import, /changelog, /name, /session, /hotkeys, /debug, /compact, /reload, /share, /clone
- [ ] B21/B22 Header động (logo + version + key hints + loaded resources)
- [ ] B25 Truy vấn màu terminal (OSC 10/11/4) + system theme auto-sync
- [ ] B27 Footer đầy đủ (↑↓ R/W cache, CH%, cost, git branch, routed model)
- [ ] B29 Markdown: list lồng nhau, ordered marker, HTML comment, strikethrough nghiêm ngặt
- [ ] B33 isKeyRelease cho editor; B34 keybindings từ settings
- [ ] B26 Fullscreen alt-screen (chuột, chọn text, scrollbar, tìm kiếm Ctrl+Shift+F)
