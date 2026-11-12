# BAOCAO — SPEC THỰC THI (dành cho LLM đọc và code trực tiếp)

> Task: gỡ bỏ `src/runtime/agent-session-interfaces.ts` cho khỏi build, rút runtime ra khỏi tầng TUI, và dọn dead code liên quan.
> Repo: `/home/quangtynu/Qcoder/test/picro` · Node/TS · `npm test` = `vitest run` · `npm run build` = `tsc`
> **Đây là tài liệu để thực thi. Mỗi bước đã có `old` / `new` chính xác. Làm theo thứ tự, không nhảy bước.**

---

## 0. Kết quả cần đạt được (Definition of Done)

Sau khi xong toàn bộ các bước:

1. File `src/runtime/agent-session-interfaces.ts` **không còn tồn tại**.
2. `src/tui/**` **không còn** tham chiếu tới `AgentSessionRuntimeInterface` hay prop `runtime`; chỉ phụ thuộc `InteractiveControllerLike`.
3. `InteractiveControllerLike` (trong `src/tui/ink/controller-bridge.ts`) có thêm `getCwd()` và `getFooterInfo()`.
4. `src/tui/ink/components/Footer.tsx` bị **xoá** (dead code), và dòng `export * from "./Footer.js";` bị xoá khỏi barrel.
5. `npx tsc --noEmit` pass 0 lỗi.
6. `npm test` pass (hoặc ít nhất các test liên quan trong §6 pass).
7. Content của `src/runtime/agent-session-interfaces.ts` vẫn phải được đọc trước khi xoá (xem §1) để biết toàn bộ API surface trước đây.

---

## 1. Ngữ cảnh (đọc để hiểu, không bắt buộc làm)

**Vai trò 2 file:**

| File | Vai trò | Xử lý |
|---|---|---|
| `src/runtime/agent-session-runtime.ts` (625 dòng) | **NÃO HỆ THỐNG**. `class AgentSessionRuntime` (dòng 62) giữ `AgentSession` + `AgentSessionServices` + `cwd`; ~40 method delegate xuống session; toàn bộ logic vòng đời phiên (`switchSession` 296, `newSession` 344, `fork` 379, `listSessions` 405, `importFromJsonl` 447, `dispose` 476). Có thêm `createAgentSessionRuntime()` (dòng 504) = composition root. | **GIỮ NGUYÊN** |
| `src/runtime/agent-session-interfaces.ts` (138 dòng) | Chỉ 100% type, không dòng logic nào. 3 export: `AgentSessionInterface` (dòng 13), `AgentSessionRuntimeInterface` (dòng 79), `AgentSessionRuntimeEvent` (dòng 112). | **XOÁ** |

**Vì sao xoá được:** `class AgentSessionRuntime` **không có** `implements AgentSessionRuntimeInterface`; cả 3 export chỉ được dùng ở các annotation kiểu trong 7 file (không enforce gì); `runtime/index.ts` re-export toàn bộ `agent/` nên biên giới tầng vốn không kín; TUI thật sự chỉ chạm runtime 4 chỗ (`App.tsx:54`, `App.tsx:72`, `Footer.tsx:28-29`). TypeScript là structural typing nên xoá interface không làm hỏng compile.

**Seam thật sự dùng cho view** là `InteractiveControllerLike` trong `src/tui/ink/controller-bridge.ts` (40 dòng) — **giữ nguyên, chỉ thêm method**.

---

## 2. Quy tắc bắt buộc (SCOPE)

**✅ CHỈ ĐƯỢC SỬA các file liệt kê trong mục 3.**

**❌ KHÔNG ĐƯỢC SỬA (ngay cả khi thấy chúng có mùi):**

- `src/runtime/skills.ts`
- `src/runtime/skills.frontmatter.test.ts`
- `src/session/**`, `src/agent/**`, `src/llm/**`
- `src/runtime/settings-manager.ts`, `src/runtime/footer-data-provider.ts`
- `package.json`, `tsconfig.json`

**❌ KHÔNG ĐƯỢC LÀM trong task này** (ghi lại ở §7 để làm sau, đừng tự làm):
gỡ tham số `agent: any` khỏi `AgentSessionRuntime`; đổi `session['agent']` sang getter; thêm `modelRuntime` vào `AgentSessionServices`; xoá `[DEBUG] console.log` trong `main.ts`; gỡ prop `runtime` khỏi `HttpServerOptions`; gộp `HttpServerOptions` trùng lặp giữa `modes/http/index.ts` và `modes/http/http-server.ts`.

**Commit:** stage từng file cụ thể, **không** `git add -A`.

---

## 3. Các bước thực hiện

### B1 — Đọc rồi xoá file interface

Đọc `src/runtime/agent-session-interfaces.ts` để nắm API surface (xong rồi mới xoá).

```bash
rm src/runtime/agent-session-interfaces.ts
```

### B2 — `src/runtime/index.ts`: bớt export

Xoá đúng 5 dòng sau (nằm ở dòng ~17–22, ngay sau block "Composition Root"):

```diff
 // Session Interfaces (UI/Runtime contracts)
 export type {
   AgentSessionInterface,
   AgentSessionRuntimeInterface,
   AgentSessionRuntimeEvent,
 } from './agent-session-interfaces.js';
```

Thêm đúng 1 export (để các mode import type mà không cần đi xa):

```diff
 export type {
   AgentSessionRuntimeDiagnostic,
   CreateAgentSessionRuntimeResult,
 } from './agent-session-runtime.js';
+
+// Lớp runtime cụ thể (trước đây các mode gõ type qua AgentSessionRuntimeInterface đã bị xoá).
+export { AgentSessionRuntime } from './agent-session-runtime.js';
```

### B3 — `src/modes/interactive/interactive-controller.ts`

```diff
-import type { AgentSessionRuntimeInterface } from '../../runtime/index.js';
+import type { AgentSessionRuntime } from '../../runtime/index.js';
```

```diff
 export interface InteractiveControllerOptions {
-  runtime: AgentSessionRuntimeInterface;
+  runtime: AgentSessionRuntime;
 }
 
 export class InteractiveController {
-  private runtime: AgentSessionRuntimeInterface;
+  private runtime: AgentSessionRuntime;
```

**Ghi chú cho LLM thực thi:** file này dùng `this.runtime.settings as any` nhiều chỗ (ví dụ `case 'settings'`, `case 'theme'`, `case 'tools'`) — **đừng đổi**, chỉ đổi type annotation như trên.

### B4 — `src/tui/ink/controller-bridge.ts`: thêm 2 method vào seam

Trong `interface InteractiveControllerLike`, chèn sau dòng `getStatus(): ControllerStatus;`:

```diff
 export interface InteractiveControllerLike {
   /** Lấy tin nhắn hiện tại (để render lần đầu). */
   getMessages(): ChatMessageLike[];
   /** Lấy trạng thái hiện tại. */
   getStatus(): ControllerStatus;
+  /** Thư mục làm việc hiện tại (Header/App dùng). */
+  getCwd(): string;
+  /** Thông tin footer: model đang chọn + tên phiên. */
+  getFooterInfo(): { model: string; sessionName: string };
   /** Lấy thông báo tạm hiện có. */
   getToasts(): ToastLike[];
```

### B5 — `src/modes/interactive/interactive-controller.ts`: hiện thực 2 method đó

Chèn ngay sau method `getStatus()`:

```ts
  getCwd(): string {
    return this.runtime.cwd;
  }

  /**
   * Model đang chọn + tên phiên.
   * Chú ý: getSessionName() thuộc SessionManager (runtime.sessionManager),
   * KHÔNG thuộc SettingsManager — code Footer.tsx cũ đọc sai chỗ này.
   */
  getFooterInfo(): { model: string; sessionName: string } {
    const settings = this.runtime.settings as any;
    const provider = settings?.getDefaultProvider?.() || "unknown";
    const model = settings?.getDefaultModel?.() || "none";
    const sessionName =
      (this.runtime.sessionManager as any)?.getSessionName?.() || "";
    return { model: `${provider}/${model}`, sessionName };
  }
```

### B6 — `src/tui/ink/App.tsx`: gỡ prop `runtime`

```diff
 import type { AgentSessionRuntimeInterface } from "../../runtime/index.js";
 import type { InteractiveControllerLike } from "./controller-bridge.js";
```
```diff
 interface AppProps {
-  runtime: AgentSessionRuntimeInterface;
   /** Cầu nối duy nhất tới logic app (xem controller-bridge.ts). */
   controller: InteractiveControllerLike;
   initialMessage?: string;
   /** Chế độ giao diện: "compact" hoặc "full". */
   layout?: "compact" | "full";
 }
 
 export const App: React.FC<AppProps> = ({
-  runtime,
   controller,
   initialMessage,
   layout = "compact",
 }) => {
   const [messages, setMessages] = useState(() => controller.getMessages());
   const [status, setStatus] = useState(() => controller.getStatus());
   const [toasts, setToasts] = useState(() => controller.getToasts());
   const [scrollOffset, setScrollOffset] = useState(0);
-  const [cwd, setCwd] = useState<string>(runtime.cwd || ".");
+  const [cwd, setCwd] = useState<string>(() => controller.getCwd());
```

```diff
   useEffect(() => {
     if (initialMessage) void controller.sendMessage(initialMessage);
-    setCwd(runtime.cwd || ".");
-  }, [runtime, initialMessage, controller]);
+    setCwd(controller.getCwd());
+  }, [initialMessage, controller]);
```

### B7 — `src/tui/ink/interactive-app.tsx`: gỡ prop `runtime`

```diff
 import type { AgentSessionRuntimeInterface } from "../../runtime/index.js";
 import type { InteractiveControllerLike } from "./controller-bridge.js";
 
 export interface InteractiveAppProps {
-  runtime: AgentSessionRuntimeInterface;
   /** Cầu nối duy nhất tới logic app (xem controller-bridge.ts). */
   controller: InteractiveControllerLike;
   initialMessage?: string;
 }
```
và trong `startInteractiveApp` (chỗ `render(...)`):

```diff
     render(
       <App
-        runtime={props.runtime}
         controller={props.controller}
         initialMessage={props.initialMessage}
       />,
```
(Không đổi `startFallbackRepl` — nó chỉ dùng `controller` và `initialMessage`.)

### B8 — Xoá `Footer.tsx` (dead code)

Lý do: `App.tsx` chỉ render `StatusBar`, **không render `Footer`**; `Footer` chỉ còn sống qua barrel `components/index.ts`. `Footer` cũng có bug: đọc `settings.getSessionName?.()` (method đó thuộc `SessionManager`, không phải `SettingsManager`) → `sessionName` luôn rỗng; và polling `setInterval(update, 2000)` thay vì subscribe event.

```bash
rm src/tui/ink/components/Footer.tsx
```

Sửa barrel `src/tui/ink/components/index.ts` — xoá 1 dòng:

```diff
 export * from "./Header.js";
-export * from "./Footer.js";
 export * from "./StatusBar.js";
```

> Nếu bạn quyết định **không** xoá mà sửa (không khuyến khích): đổi `FooterProps` từ `runtime?: AgentSessionRuntimeInterface` sang `controller?: InteractiveControllerLike`, thay `runtime.cwd` → `controller.getCwd()`, và `settings.getSessionName?.()` → `controller.getFooterInfo().sessionName`.

### B9 — `src/modes/interactive/interactive-mode.ts`

File này chưa được ai import (dead code), nhưng vẫn phải compile nên cũng phải đổi type:

```diff
-import type { AgentSessionRuntimeInterface } from "../../runtime/index.js";
+import type { AgentSessionRuntime } from "../../runtime/agent-session-runtime.js";
```
```diff
-  private runtime!: AgentSessionRuntimeInterface;
+  private runtime!: AgentSessionRuntime;
```

**Giữ nguyên** đoạn `refreshCatalogs()` có `as unknown as` (dòng ~245–251) — `AgentSessionServices` không khai `modelRuntime` nên cast vẫn cần.

### B10 — `src/modes/http/http-server.ts` và `src/modes/http/index.ts`

Cả 2 file:

```diff
-import type { AgentSessionRuntimeInterface } from "../../runtime/index.js";
+import type { AgentSessionRuntime } from "../../runtime/agent-session-runtime.js";
```

Trong `http-server.ts` (biến local trong `interface HttpServerOptions`):

```diff
 interface HttpServerOptions {
   port?: number;
   host?: string;
-  runtime: AgentSessionRuntimeInterface;
+  runtime: AgentSessionRuntime;
   controller: InteractiveController;
 }
```

Trong `modes/http/index.ts` (`export interface HttpServerOptions`):

```diff
 export interface HttpServerOptions {
   port?: number;
   host?: string;
-  runtime: AgentSessionRuntimeInterface;
+  runtime: AgentSessionRuntime;
   controller: InteractiveController;
 }
```

**KHÔNG** đổi caller trong `src/main.ts` (B11 mới là chỗ này).

### B11 — `src/main.ts`: sửa call site `startInteractiveApp` + bỏ dead import

```diff
     startHttpServer({
       port,
       host,
       runtime,
       controller,
```
(không đổi)

```diff
   } else {
     // Default: Ink TUI mode
     startInteractiveApp({
-      runtime,
       controller,
       initialMessage: initialResult.initialMessage,
     });
   }
```

`runtime` (biến local, dòng 338) **giữ nguyên** — vẫn cần cho `subscribeToSessionEvents` (341), `runtime.session.prompt` (377/380), `runtime.switchSession` (365), `runtime.dispose` (shutdown).

Bỏ dead import ở dòng 28:

```diff
 import { InteractiveController } from "./modes/interactive/interactive-controller.js";
-import { createAgentSessionRuntime } from "./runtime/agent-session-runtime.js";
 import { startHttpServer } from "./modes/http/index.js";
```

**Giữ nguyên** import dòng 20: `import { AgentSessionRuntime } from "./runtime/agent-session-runtime.js";` (dùng cho kiểu `subscribeToSessionEvents(runtime: AgentSessionRuntime)`).

### B12 — `src/modes/interactive/interactive-controller.test.ts`

```diff
-import type { AgentSessionRuntimeInterface } from '../../runtime/index.js';
+import type { AgentSessionRuntime } from '../../runtime/index.js';
```

```diff
-  } as unknown as AgentSessionRuntimeInterface;
+  } as unknown as AgentSessionRuntime;
```

Để nguyên `as unknown as` (mock chỉ dựng 1 phần field). Nếu mock hiện thiếu member gây lỗi compile sau khi đổi sang class cụ thể (ít khả năng xảy ra vì `as unknown as` bỏ qua check), bổ sung field thiếu vào mock.

---

## 4. Tổng hợp thay đổi

| # | File | Loại | Nội dung |
|---|---|---|---|
| 1 | `src/runtime/agent-session-interfaces.ts` | **XOÁ** | 138 dòng type không dùng |
| 2 | `src/runtime/index.ts` | edit | bỏ 5 dòng export type, thêm `export { AgentSessionRuntime }` |
| 3 | `src/modes/interactive/interactive-controller.ts` | edit | 2 annotation type + thêm `getCwd()`/`getFooterInfo()` |
| 4 | `src/tui/ink/controller-bridge.ts` | edit | thêm 2 method vào `InteractiveControllerLike` |
| 5 | `src/tui/ink/App.tsx` | edit | gỡ prop `runtime`, dùng `controller.getCwd()` |
| 6 | `src/tui/ink/interactive-app.tsx` | edit | gỡ prop `runtime` khỏi props + `<App>` |
| 7 | `src/tui/ink/components/Footer.tsx` | **XOÁ** | dead code |
| 8 | `src/tui/ink/components/index.ts` | edit | xoá `export * from "./Footer.js";` |
| 9 | `src/modes/interactive/interactive-mode.ts` | edit | 2 annotation type |
| 10 | `src/modes/http/http-server.ts` | edit | 1 import + 1 annotation type |
| 11 | `src/modes/http/index.ts` | edit | 1 import + 1 annotation type |
| 12 | `src/main.ts` | edit | bỏ `runtime` khỏi `startInteractiveApp`, bỏ dead import dòng 28 |
| 13 | `src/modes/interactive/interactive-controller.test.ts` | edit | đổi type import + target của `as unknown as` |

**Kiến trúc sau refactor:**
```
main.ts ──> AgentSessionRuntime ──> InteractiveController ──┐
                                                            ├─> App.tsx / FallbackRepl (TUI)
main.ts ──> startHttpServer ──> HttpServer ─────────────────┘
```
Tầng `src/tui/**` chỉ biết `InteractiveControllerLike`.

---

## 5. Thứ tự phụ thuộc

Làm theo thứ tự này để mỗi lệnh `tsc` chỉ lộ 1 vấn đề:

```
B1 + B2   → B3 + B12 → B9 → B10 → B4 + B5 → B6 → B7 → B8 → B11 → verify
```

Lý do: B4/B5 (thêm method vào seam) phải xong **trước** B6/B7, vì B6/B7 gọi `controller.getCwd()`.

---

## 6. Verify (bắt buộc chạy)

```bash
# 1. Gate chính — phải sạch 0 lỗi
npx tsc --noEmit

# 2. Test liên quan
npx vitest run src/modes/interactive/
npx vitest run src/runtime/agent-session-runtime.test.ts
npx vitest run src/runtime/agent-session-runtime.branches.test.ts
npx vitest run src/runtime/agent-session-runtime.more.test.ts
npx vitest run src/runtime/agent-session-runtime.extra.test.ts
npx vitest run src/session/agent-session-resume.test.ts

# 3. Toàn bộ
npm test

# 4. Smoke CLI
npm run build
node dist/cli.js --help
printf 'a\n' | node dist/cli.js --no-session        # đường fallback readline
node dist/cli.js --mode http --host 127.0.0.1 &  sleep 1 && curl -s localhost:3000/health && curl -s localhost:3000/status && kill %1
```

Nếu `tsc` báo lỗi, **đừng** thêm `as any`/`as unknown as` để qua — hãy đọc lỗi, sửa đúng annotation hoặc bổ sung method còn thiếu.

---

## 7. Ngoài phạm vi (ĐỪNG làm trong task này)

1. `AgentSessionRuntime` constructor nhận `agent: any` nhưng field `_agent` không bao giờ được đọc → có thể bỏ tham số.
2. `createAgentSessionRuntime()` đọc `session['agent']` (private) → nên thêm getter `getAgent()`.
3. `refreshCatalogs()` trong `interactive-mode.ts` phải cast `as unknown as` vì `AgentSessionServices` (dòng 95 của `agent-session-services.ts`) không khai `modelRuntime`.
4. `main.ts` in `[DEBUG]` bằng `console.log` bất chấp `VERBOSE` (dòng 32, 44, 48).
5. `HttpServerOptions` bị khai báo 2 lần giống hệt ở `modes/http/index.ts` và `modes/http/http-server.ts` → nên export từ chỗ 1.
6. `HttpServer` chỉ dùng `runtime` cho `/sessions` (`runtime.sessionManager`) → có thể chuyển sang controller rồi bỏ hẳn prop `runtime`.
7. `src/modes/interactive/interactive-mode.ts` là dead code (không ai import) — có thể xoá luôn 297 dòng thay vì chỉ đổi type (nếu làm, ghi trong commit message để dễ revert).
