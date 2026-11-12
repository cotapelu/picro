# BÁO CÁO: Vai trò `agent-session-interfaces.ts` / `agent-session-runtime.ts` & Kế hoạch refactor "Cách B"

> Ngày lập: phiên làm việc hiện tại  
> CWD: `/home/quangtynu/Qcoder/test/picro` (branch `main`, HEAD `4aec5fc`)  
> Phạm vi: **chỉ phân tích + kế hoạch. Chưa sửa code.**  
> ⚠️ Có agent khác đang làm trên `src/runtime/skills.ts` + `src/runtime/skills.frontmatter.test.ts` (xem §9).

---

## 1. Tóm tắt điều hành

1. `src/runtime/agent-session-runtime.ts` (625 dòng) = **hiện thực thật**: class `AgentSessionRuntime` + factory `createAgentSessionRuntime()`. File cốt lõi, **không xoá**.
2. `src/runtime/agent-session-interfaces.ts` (138 dòng) = **chỉ type, không có logic**. Cả 3 export đều **không được dùng** ngoài việc tự re-export. Không `implements`, không enforce được gì. **Đề xuất xoá nguyên file.**
3. Interactive mode mặc định đi: `main.ts` → **class `AgentSessionRuntime`** (không qua factory) → `InteractiveController` → `tui/ink/interactive-app.tsx` (Ink TUI).
4. Phát hiện phụ: `Footer.tsx` và `modes/interactive/interactive-mode.ts` là **dead code** (chưa từng được import/mount).

---

## 2. Kiến trúc hiện tại — ai gọi ai

### 2.1 Đường đi interactive (đường "nóng", thật sự chạy)

```
bin/cli.js / src/main.ts
  │
  ├─ createAgentSessionServices()          src/session/agent-session-services.ts:110
  ├─ createAgentSessionFromServices()      src/session/agent-session-services.ts
  ├─ new AgentSessionRuntime(agent, session, services)   ← main.ts:338 (class trực tiếp)
  ├─ subscribeToSessionEvents(runtime)     main.ts:31
  ├─ runtime.session.prompt(initial)       main.ts:377-381
  ├─ new InteractiveController({ runtime }) main.ts:388
  │
  └─ startInteractiveApp({ runtime, controller, initialMessage })
         src/tui/ink/interactive-app.tsx
            ├─ process.stdin.isTTY? render(<App/>) : startFallbackRepl()
            │      src/tui/ink/App.tsx
            │        ├─ controller.getMessages() / getStatus() / getToasts()
            │        ├─ controller.onMessage / onStatusChange / onToast
            │        ├─ controller.sendMessage / subscribeEvents
            │        ├─ runtime.cwd            ← App.tsx:54, :72  (ĐỌC TRỰC TIẾP)
            │        └─ StatusBar, Header, Toast, Keybindings, MessageInput
            └─ readline REPL (khi không phải TTY)
```

Đáng chú ý: `createAgentSessionRuntime()` (factory, dòng 504) **không được main.ts gọi**. main.ts chỉ `import` ở dòng 28 mà không dùng (dead import). Factory chỉ được gọi từ `InteractiveMode` (§4.1) và test.

### 2.2 Các đường khác cùng dùng runtime

| Mode | File | Cách tạo / cầm runtime |
|---|---|---|
| Interactive (mặc định) | `src/main.ts` → `interactive-app.tsx` | `new AgentSessionRuntime(...)` trực tiếp |
| Interactive (nhánh chết) | `src/modes/interactive/interactive-mode.ts` | `createAgentSessionRuntime(factory, ...)` |
| HTTP / RPC | `src/main.ts:391` → `src/modes/http/index.ts` | object từ main.ts, ép type `AgentSessionRuntimeInterface` |

Khi chạy `--mode http|rpc`, `startHttpServer({ port, host, runtime, controller })` — thực ra controller đã gói sẵn runtime rồi (mọi endpoint HTTP chỉ gọi `controller.*`; riêng `/sessions` đọc `runtime.sessionManager`).

---

## 3. Vai trò 2 file (trả lời câu hỏi gốc)

### 3.1 `src/runtime/agent-session-runtime.ts` — "cái gì thật"

**`class AgentSessionRuntime`** (dòng 62): composition root, sở hữu `AgentSession` + `AgentSessionServices` + `cwd`.

- ~40 method chỉ là **delegate thuần** xuống session: `prompt`, `subscribe`, `messages`, `abort`, `getTools`, `getTree`, `compact`, `recordBashResult`, `sessionManager`… (dòng 170–286)
- Toàn bộ **logic vòng đời phiên** nằm ở đây:
  - `switchSession(path)` — dòng 296: mở file JSONL → `createAgentSessionFromServices` → **thay `this._session`**
  - `newSession()` — dòng 344: `SessionManager.continueRecent` + `newSession()`
  - `fork(entryId)` — dòng 379: `branchWithSummary()` (đã sửa bug `selectedText`)
  - `listSessions()`, `importFromJsonl()`, `dispose()` — dòng 405/447/476
  - `setBeforeSessionInvalidate()` / `setRebindSession()` — dòng 490, 495 (hook cho UI dọn extension)
- `copyToClipboard()` — dòng 120: thử `clipboardy`, fallback `pbcopy`/`xclip`/`clip`
- Getter `settings` → `services.settingsManager`; `authStorage` → `services.authStorage`

**`createAgentSessionRuntime()`** — dòng 504: entry point chính
1. `fs.mkdirSync(agentDir)` nếu chưa có
2. `createAgentSessionServices({ cwd, agentDir })`
3. `options.sessionManager` hoặc `SessionManager.continueRecent(cwd, services.sessionDir)`
4. Resolve model: string → tra `modelRegistry` (provider hint trước, rồi quét mọi provider); nếu không có model → thử lấy từ session đang resume → fallback settings default
5. `createAgentSessionFromServices({ services, sessionManager, model, thinkingLevel, ... })`
6. `const agent = session['agent']` (đọc private, comment *"Access private property for now"*)
7. Gọi `createRuntime(...)` factory (điểm mở rộng cho extension), merge `diagnostics`

> Lưu ý chất lượng: constructor nhận `agent: any` nhưng field `_agent` **không bao giờ được dùng lại** — có thể bỏ tham số này.

### 3.2 `src/runtime/agent-session-interfaces.ts` — "bản hợp đồng"

Toàn file **138 dòng, 100% là type**, không có 1 dòng code chạy. 3 export:

| Export | Dòng | Nội dung | Ai xài |
|---|---|---|---|
| `AgentSessionInterface` | 13 | ~35 method cho 1 phiên: `prompt`, `subscribe`, `messages`, `abort`, queue, tools, model, tree/fork, compaction, bash, `sessionManager` | *không ai* |
| `AgentSessionRuntimeInterface` | 79 | `session` + quản lý phiên + `settings`/`auth`/`copyToClipboard` | 7 file (chỉ để gõ type) |
| `AgentSessionRuntimeEvent` | 112 | union 17 event cho UI | *không ai* |

Header file tự nhận: *"Shared types for agent session interface / Used by both agent runtime and TUI components"* — nhưng phần "TUI components" chỉ đúng theo nghĩa chữ, xem §4.

`AgentSessionRuntimeEvent` là **bản trùng** của event type thật trong `src/session/agent-session-types.ts` (`AgentSessionEvent`, `CompactionStartEvent`, `QueueUpdateEvent`…) — `runtime/index.ts` re-export bộ thật, không re-export bộ này.

---

## 4. Interface có hiệu quả không? (bằng chứng đếm được)

### 4.1 Không enforce được gì

| Tiêu chí | Thực tế | Hệ quả |
|---|---|---|
| `class AgentSessionRuntime` có `implements`? | **KHÔNG** (dòng 62: `export class AgentSessionRuntime {`) | Interface không ép class, không phát hiện được lệch |
| Mock trong test tuân thủ? | **KHÔNG** — `interactive-controller.test.ts:57` dùng `as unknown as AgentSessionRuntimeInterface` | Guard bị ép thoát, lỗi kiểu vẫn lọt |
| Biên giới tầng kín? | **KHÔNG** — `runtime/index.ts` re-export cả `Agent`, `ToolExecutor`, `AgentSession`, `SettingsManager`… | TUI import class cụ thể vẫn được, không ai chặn |
| Có hiện thực thứ 2? | **KHÔNG**, chỉ có 1 class | Interface không đổi lại được implementation |

**Drift đã xảy ra** (interface nói một đằng, class một nẻo):

| Thành viên | Interface | Class `AgentSessionRuntime` |
|---|---|---|
| `dispose()` | thiếu | có (dòng 476) |
| `importFromJsonl()` | thiếu | có (dòng 447) |
| `diagnostics` / `modelFallbackMessage` | thiếu | có (dòng 164, 170) |
| `compact()`, `abortCompaction()`, `abortRetry()` | thiếu ở cả 2 interface | class **có** (dòng 262–270) |
| `listSessions()` kiểu trả | `{id,path,cwd,modified?,name?,firstMessage?}` | chỉ `{id,path,cwd}` |
| `services` | `services: any` | `AgentSessionServices` |

Nếu class có `implements`, 4 lỗi kiểu đầu lẽ ra phải báo.

### 4.2 Số lần TUI thật sự chạm runtime: **4**

```
src/tui/ink/App.tsx:54              setCwd(runtime.cwd || ".")          // useState init
src/tui/ink/App.tsx:72              setCwd(runtime.cwd || ".")          // useEffect
src/tui/ink/components/Footer.tsx:28 const cwd = runtime.cwd || ".";
src/tui/ink/components/Footer.tsx:29 const settings = runtime.settings || {};
```

Trong khi TUI chạm **controller** (interface tốt hơn) ở ~20 chỗ via `controller.*`.

→ 138 dòng interface bảo vệ **2 property** trên một cánh cửa gần như không ai đi. Phần còn lại (19 call site) đi qua `InteractiveController`.

### 4.3 So sánh với một interface trong repo mà **có** hiệu quả

`src/runtime/footer-data-provider.ts:63`:
```ts
export interface FooterDataProvider {
  getData(): FooterData;
  onChange(callback: (data: FooterData) => void): () => void;
}
export class DefaultFooterDataProvider implements FooterDataProvider { ... }
```
- Có `implements` ✔
- Có test riêng (`footer-data-provider.test.ts`) ✔
- Gọn: 2 method, và `FooterData` có kiểu cụ thay `any` ✔
- Là seam có ích: nơi swap provider ✔

→ Chuẩn của repo cho thấy interface "có giá trị" trông như thế nào. `agent-session-interfaces.ts` khác chuẩn đó ở mọi mặt.

### 4.4 Kết luận §4

Lợi duy nhất còn lại: **đọc nhanh API surface** (138 dòng thay vì 625 dòng). Đó là giá trị tài liệu, không phải giá trị kiến trúc — mà `AgentSessionRuntime` + `Pick<...>` cũng cho được, không tốn chi phí drift.

---

## 5. Phát hiện phụ: dead code

| Thứ | Trạng thái | Bằng chứng |
|---|---|---|
| `src/modes/interactive/interactive-mode.ts` (297 dòng: `InteractiveMode`, `runInteractiveMode`) | **Không ai import** | grep toàn `src/` → 0 import ngoài chính nó |
| `src/tui/ink/components/Footer.tsx` (66 dòng) | **Không ai mount** | `App.tsx:15-22` import 7 component, **không có Footer**. Chỉ còn đường `components/index.ts:44` (barrel), và barrel cũng không ai import |
| `src/tui/ink/components/index.ts` (barrel) | Không ai import | grep `components/index.js` → 0 |
| `main.ts:28` `import { createAgentSessionRuntime }` | Dead import | chỉ `time("createAgentSessionRuntime")` ở 351 |
| `AgentSessionRuntime._agent` field + tham số constructor `agent` | Không dùng | không có chỗ đọc `this._agent` |

Ngoài ra `Footer.tsx` có lỗi tính năng sẵn: gọi `settings.getSessionName?.()` (Footer.tsx:31) trong khi `getSessionName()` nằm trên **`SessionManager`** (`session-manager.ts:756`), không phải `SettingsManager` → `sessionName` luôn rỗng. Footer cũng lặp `setInterval(update, 2000)` (Footer.tsx:46) thay vì subscribe event.

---

## 6. Quyết định: **Cách B**

**Xoá `agent-session-interfaces.ts`. Cho TUI/HTTP/interactive dùng trực tiếp `AgentSessionRuntime` (class cụ thể). Giữ `InteractiveControllerLike` làm seam duy nhất.**

Vì sao không phải cách khác:

| Cách | Đánh giá |
|---|---|
| Giữ nguyên interface | Chi phí drift thật, lợi ích chỉ là "đọc nhanh" có thể thay bằng `Pick<>` |
| Derive type (`export type X = Pick<AgentSessionRuntime, ...>`) | Tốt nhưng vẫn thừa 1 lớp; class đã hiện thực đúng surface, TS structural check đủ |
| Seam ở controller | **Chọn cái này** — TUI chỉ phụ thuộc domain logic, không phụ thuộc hạ tầng. HTTP mode cũng dùng chung controller |

Bẫy phải tránh khi vẫn giữ interface: *"bạn không cần interface cho đến khi có implementation thứ hai"*. Monolith 1 package như `picro` chưa tới lúc cần.

---

## 7. Kế hoạch refactor chi tiết

### 7.1 Nhánh A — Dọn interface (6 file đổi type, 1 file xoá)

**① XOÁ FILE** `src/runtime/agent-session-interfaces.ts` (138 dòng)

**② `src/runtime/index.ts`** — bỏ block:
```ts
// (xóa 5 dòng, dòng 17–22)
// Session Interfaces (UI/Runtime contracts)
export type {
  AgentSessionInterface,
  AgentSessionRuntimeInterface,
  AgentSessionRuntimeEvent,
} from './agent-session-interfaces.js';
```

**③ `src/modes/interactive/interactive-controller.ts`**
```diff
-import type { AgentSessionRuntimeInterface } from '../../runtime/index.js';
+import type { AgentSessionRuntime } from '../../runtime/index.js';
 // ^ hoặc: from '../../runtime/agent-session-runtime.js' (né barrel, hẹp hơn)
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

**④ `src/modes/interactive/interactive-mode.ts`**
```diff
-import type { AgentSessionRuntimeInterface } from "../../runtime/index.js";
+import type { AgentSessionRuntime } from "../../runtime/agent-session-runtime.js";
```
```diff
-  private runtime!: AgentSessionRuntimeInterface;
+  private runtime!: AgentSessionRuntime;
```

**⑤ `src/modes/http/http-server.ts`** và **⑥ `src/modes/http/index.ts`**
```diff
-import type { AgentSessionRuntimeInterface } from "../../runtime/index.js";
-  runtime: AgentSessionRuntimeInterface;
+import type { AgentSessionRuntime } from "../../runtime/agent-session-runtime.js";
+  runtime: AgentSessionRuntime;
```

**⑦ `src/modes/interactive/interactive-controller.test.ts`**
```diff
-import type { AgentSessionRuntimeInterface } from '../../runtime/index.js';
+import type { AgentSessionRuntime } from '../../runtime/index.js';
-  } as unknown as AgentSessionRuntimeInterface;
+  } as unknown as AgentSessionRuntime;
```
> Vẫn cần `as unknown as` vì mock cố tình chỉ dựng 1 phần field. Nếu muốn strict: bổ sung đủ member cho mock, sau đó bỏ hẳn cast. **Nội nhánh B: nên làm vì đây là chỗ interface từng "không bảo vệ" được.**

### 7.2 Nhánh B — Gỡ runtime khỏi TUI (kể cả Footer)

Mục tiêu cuối: `src/tui/**` **không còn prop `runtime`**, chỉ nói chuyện với `controller`.

**⑧ `src/tui/ink/controller-bridge.ts`** — thêm 2 method vào `InteractiveControllerLike`:
```ts
export interface InteractiveControllerLike {
  // ... các method có sẵn

  /** Thư mục làm việc hiện tại (Header dùng). */
  getCwd(): string;

  /** Thông tin footer: model đang chọn + tên phiên. */
  getFooterInfo(): { model: string; sessionName: string };
}
```

**⑨ `src/modes/interactive/interactive-controller.ts`** — hiện thực:
```ts
getCwd(): string {
  return this.runtime.cwd;
}

getFooterInfo(): { model: string; sessionName: string } {
  const settings = this.runtime.settings as any;
  const provider = settings?.getDefaultProvider?.() || "unknown";
  const model = settings?.getDefaultModel?.() || "none";
  const sessionName =
    this.runtime.sessionManager?.getSessionName?.() || "";
  return { model: `${provider}/${model}`, sessionName };
}
```
(đây là bản sửa bug của `Footer.tsx:31` — `getSessionName` phải đọc từ `sessionManager`, không phải `settings`)

**⑩ `src/tui/ink/App.tsx`**
```diff
-import type { AgentSessionRuntimeInterface } from "../../runtime/index.js";
 import type { InteractiveControllerLike } from "./controller-bridge.js";
 
 interface AppProps {
-  runtime: AgentSessionRuntimeInterface;
   controller: InteractiveControllerLike;
   initialMessage?: string;
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
Ghi chú: `setCwd` ở effect hiện là **no-op thực tế** (không cwd không bao giờ đổi trong vòng đời `AgentSessionRuntime`). Chỉ giữ lại để khỏi đổi hành vi.

**⑪ `src/tui/ink/interactive-app.tsx`**
```diff
-import type { AgentSessionRuntimeInterface } from "../../runtime/index.js";
 import type { InteractiveControllerLike } from "./controller-bridge.js";
 
 export interface InteractiveAppProps {
-  runtime: AgentSessionRuntimeInterface;
   controller: InteractiveControllerLike;
   initialMessage?: string;
 }
```
- `startFallbackRepl()` đã chỉ dùng `controller` (dòng 28: `const { controller, initialMessage } = props;`) → **không cần đổi**.
- `<App ...>` (dòng 78–82): bỏ prop `runtime`.

**⑫ `src/tui/ink/components/Footer.tsx`** — **dead code** (§5). Hai lựa chọn, xin chọn phương án 1:

*Phương án 1 (khuyên): xoá.*
```
rm src/tui/ink/components/Footer.tsx
```
Lý do: không ai mount; `App.tsx` dùng `StatusBar` (đã nhận `cwd` qua `controller.getStatus()`); Footer trùng chức năng, có bug `getSessionName`, và polling 2s thay vì subscribe. Kèm theo mới sạch: xoá dòng `export * from "./Footer.js";` trong `src/tui/ink/components/index.ts`, hoặc xoá luôn cả file barrel (cũng không ai import).

*Phương án 2 (nếu muốn giữ để dựng lại):* đổi props sang controller
```diff
-import type { AgentSessionRuntimeInterface } from "../../../runtime/index.js";
+import type { InteractiveControllerLike } from "../controller-bridge.js";
 
 interface FooterProps {
-  runtime?: AgentSessionRuntimeInterface;
+  controller?: InteractiveControllerLike;
 }
 
 export const Footer: React.FC<FooterProps> = ({ controller }) => {
@@   useEffect(() => {
-    if (!runtime) return;
+    if (!controller) return;
     const update = () => {
       try {
-        const cwd = runtime.cwd || ".";
-        const settings = runtime.settings || {};
-        const defaultProvider = settings.getDefaultProvider?.() || "unknown";
-        const defaultModel = settings.getDefaultModel?.() || "none";
+        const cwd = controller.getCwd();
+        const info = controller.getFooterInfo();
+        const defaultProvider = info.model.split("/")[0] || "unknown";
+        const defaultModel = info.model.split("/")[1] || "none";
         setStatus({
           cwd,
           model: info.model,
           tokens: "0/0",
           contextPercent: "0%",
@@
-          sessionName: settings.getSessionName?.() || "",
+          sessionName: info.sessionName,
```

**⑬ `src/main.ts`** — call site của `startInteractiveApp`:
```diff
   startInteractiveApp({
-    runtime,
     controller,
     initialMessage: initialResult.initialMessage,
   });
```
`runtime` vẫn được giữ trong `main.ts` (vẫn cần cho `subscribeToSessionEvents`, `runtime.session.prompt`, `runtime.switchSession`, `runtime.dispose`). Nhân tiện bỏ dead import dòng 28 (`createAgentSessionRuntime`) nếu không dùng.

### 7.3 Thứ tự và cách verify

```
1. ① xoá agent-session-interfaces.ts + ② runtime/index.ts
2. ⑦ + ③ đổi type (controller + test)     ← nền tảng
3. ④⑤⑥ interactive-mode, http-server, http/index
4. ⑧⑨ thêm getCwd/getFooterInfo vào controller + bridge
5. ⑩⑪⑫ App, interactive-app, Footer
6. ⑬ main.ts
```
```bash
npx tsc --noEmit                 # gate bắt buộc: phải sạch 0 lỗi
npx vitest run src/modes/interactive/
npx vitest run src/runtime/agent-session-runtime.test.ts \
              src/runtime/agent-session-runtime.branches.test.ts \
              src/runtime/agent-session-runtime.more.test.ts \
              src/runtime/agent-session-runtime.extra.test.ts
npx vitest run backend/           # toàn bộ
```

Nghiệm thủ công bằng CLI:
```bash
npm run dev                                        # smoke TUI
printf 'a\n' | node dist/cli.js --no-session       # smoke fallback readline
node dist/cli.js --mode http --host 127.0.0.1 \
  & sleep 1 && curl -s localhost:3000/health && curl -s localhost:3000/status
```

Danh sách test đã biết liên quan (không viết test mới trong bước này):
`src/modes/interactive/interactive-controller.test.ts`, `src/runtime/agent-session-runtime*.test.ts` (4 file), `src/session/agent-session-resume.test.ts`, `src/tui/ink/*` (nếu có).

---

## 8. Kết quả sau refactor

| Chỉ số | Trước | Sau |
|---|---|---|
| Dòng code (file bị xoá) | +138 | 0 |
| Lớp giả (định nghĩa trùng) | 1 (100% type trùng class) | 0 |
| TUI phụ thuộc runtime trực tiếp | 4 chỗ (App ×2, Footer ×2) | 0 |
| Chỉnh API → nơi cần sửa | interface + class + 7 call site (dễ trôi dạt) | class → compiler báo đúng 1 chỗ |
| Seam dùng cho test | `AgentSessionRuntimeInterface` (ép thaát qua cast) | `InteractiveControllerLike` (đang chạy thật) |
| Footer | dead code, bug `getSessionName` | xoá (hoặc sửa qua controller) |

Kiến trúc sau refactor:

```
main.ts ──> AgentSessionRuntime ──> InteractiveController ──┐
                                                            ├─> App.tsx / FallbackRepl
main.ts ──> startHttpServer ──> HttpServer ─────────────────┘
```
Tầng view chỉ biết `InteractiveControllerLike` (40 dòng, đã tồn tại).

---

## 9. Rủi ro & xung đột đa-agent

- **Đang có thay đổi từ agent khác:** `src/runtime/skills.ts` (modified) và `src/runtime/skills.frontmatter.test.ts` (untracked). Kế hoạch trên **không đụng** 2 file này — `git add` theo từng file cụ thể, **không** `git add -A`.
- `git status` cho thấy ` BAOCAO.md` (báo cáo cũ đã xoá; file này là bản mới).
- Xoá `Footer.tsx` có thể chạm kế hoạch của agent kia nếu họ đang định dựng Footer → gợi ý làm nhánh B (`Footer`) ở **commit riêng** để revert dễ.
- `interactive-mode.ts` là dead code: có thể xoá luôn (297 dòng) hoặc chỉ đổi type rồi để đó. Không ảnh hưởng đường chạy. Nếu agent kia có kế hoạch "nối lại nhánh InteractiveMode" thì chỉ nên đổi type.
- Có 1 thay đổi nhỏ gây "noise": `main.ts` bỏ import `AgentSessionRuntime` nếu chỉ còn dùng cho dispose/switchSession → thực ra main.ts **vẫn cần** import `AgentSessionRuntime` (dòng 20, cho kiểu `subscribeToSessionEvents(runtime: AgentSessionRuntime)`), nên giữ.

---

## 10. Việc ngoài phạm vi (ghi lại, làm sau)

1. `AgentSessionRuntime` constructor nhận `agent: any` nhưng không dùng → bỏ tham số, bỏ field `_agent`.
2. `createAgentSessionRuntime()` đọc `session['agent']` (private) → nên để session expose `getAgent()` hoặc bỏ hẳn `agent` khỏi runtime.
3. `interactive-mode.ts` dùng `this.runtime as unknown as { services?: ... }` ở `refreshCatalogs()` (dòng 245–251). `AgentSessionServices` **không khai** `modelRuntime` (xem `agent-session-services.ts:95`), nên **vẫn phải cast** dù đã dùng class cụ thể. Nếu muốn bỏ cast: khai `modelRuntime?: ModelCatalogRuntime` vào `AgentSessionServices`, hoặc thêm getter có kiểu lên runtime.
4. `getSettings()` trong interface là `any` — hiện không ai dùng, bỏ qua.
5. `main.ts` chạy `subscribeToSessionEvents` in ra rất nhiều `console.log('[DEBUG] ...)`, cả khi không bật `VERBOSE` (dòng 32, 44, 48) → nên chỉ in khi `VERBOSE`.
6. `HttpServer` `runtime` chỉ được dùng cho `runtime.sessionManager.getEntries()` (`/sessions`) → có thể đổi sang controller như các endpoint kia, rồi bỏ hẳn prop `runtime` khỏi `HttpServerOptions`.

---

## 11. Tóm tắt 3 dòng

1. `agent-session-runtime.ts` = não (giữ nguyên). `agent-session-interfaces.ts` = vỏ rỗng (xoá).
2. Dùng class trực tiếp; chỉ giữ `InteractiveControllerLike` làm seam thật cho view.
3. Thưởng thêm: dọn luôn `Footer.tsx` (dead code) và dead import của `createAgentSessionRuntime` trong `main.ts`.
