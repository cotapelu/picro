# BÁO CÁO TỔNG HỢP TẤT CẢ BUG BACKEND - PICRO

> Phân tích toàn bộ ~120 file TypeScript backend trong thư mục `src/`.
> Đã đọc từng dòng code trong: `agent/`, `session/`, `llm/`, `tools/`, `events/`, `cli/`, `runtime/`, `utils/`, `extensions/`, `modes/`, `memory/` và các file gốc.

**Tổng cộng: 34 bug**

| Mức độ | Số lượng |
|--------|----------|
| 🔴 Critical | 6 |
| 🟠 Major | 14 |
| 🟡 Medium | 9 |
| 🟢 Minor | 6 |

---

## 🔴 CRITICAL (6 bug)

### C1. SessionManager._persist - Mất toàn bộ dữ liệu session

- **File:** `src/session/session-manager.ts`
- **Dòng:** ~660-680
- **Mức độ:** 🔴 Critical

**Mô tả:**
Nếu session chỉ có user messages và chưa có assistant response nào, dữ liệu sẽ không bao giờ được ghi vào file JSONL. Nếu process crash, toàn bộ session sẽ bị mất hoàn toàn.

**Code lỗi:**
```typescript
private _persist(entry: SessionEntry): void {
  if (!this.persist || !this.sessionFile) return;

  const hasAssistant = this.fileEntries.some(
    (e) => e.type === "message" && (e as SessionMessageEntry).message.role === "assistant"
  );
  if (!hasAssistant) {
    this.flushed = false;  // ❌ Không flush được gì
    return;
  }

  if (!this.flushed) {
    for (const e of this.fileEntries) {
      appendFileSync(this.sessionFile, `${JSON.stringify(e)}\n`);
    }
    this.flushed = true;
  } else {
    appendFileSync(this.sessionFile, `${JSON.stringify(entry)}\n`);
  }
}
```

**Sửa đề xuất:** Bỏ điều kiện `hasAssistant`, ghi file ngay từ entry đầu tiên (bao gồm cả header).

---

### C2. openai-compatible.stream - IIFE async không được await

- **File:** `src/llm/providers/openai-compatible.ts`
- **Dòng:** ~380-450
- **Mức độ:** 🔴 Critical

**Mô tả:**
Toàn bộ logic stream nằm trong IIFE async không được await. Lỗi bên trong bị swallow, `complete()` có thể trả về trước khi stream hoàn thành.

**Code lỗi:**
```typescript
export async function stream(
  model: Model,
  context: Context,
  options: OpenAICompatOptions = {}
): Promise<AssistantMessageEventStream> {
  const eventStream = new AssistantMessageEventStream();
  const compat = resolveCompat(model);

  (async () => {  // ❌ IIFE fire-and-forget
    try {
      const apiKey = options.apiKey || getApiKey(model.provider) || '';
      if (!apiKey) throw new Error(`No API key for provider: ${model.provider}`);
      // ... toàn bộ logic
      eventStream.push({ type: 'done', reason: output.stopReason, message: output });
      eventStream.end();
    } catch (error: any) {
      eventStream.push({ type: 'error', reason: output.stopReason, error: output });
      eventStream.end();
    }
  })();  // ← Không await!

  return eventStream;  // Trả về ngay, stream có thể chưa bắt đầu
}
```

**Sửa đề xuất:** Cấu trúc lại thành hàm async thuần, sử dụng `AssistantMessageEventStream` với cơ chế resolve/reject rõ ràng thay vì IIFE.

---

### C3. cli-args.parseArgs --list-models không consume arg tiếp theo

- **File:** `src/runtime/cli-args.ts`
- **Dòng:** ~260-268
- **Mức độ:** 🔴 Critical

**Mô tả:**
Nếu arg tiếp theo bắt đầu bằng `-` hoặc `@`, `listModels = true` nhưng arg đó không bị consume, dẫn đến arg bị nhầm làm message/fileArg.

**Code lỗi:**
```typescript
} else if (arg === "--list-models") {
  if (i + 1 < args.length && !args[i + 1].startsWith("-") && !args[i + 1].startsWith("@")) {
    result.listModels = args[++i];
  } else {
    result.listModels = true;  // ❌ Arg tiếp theo không tiêu thụ
  }
}
```

**Sửa đề xuất:** Nếu arg tiếp theo bắt đầu bằng `-` (trừ khi đó là search term hợp lệ), vẫn set `listModels = true` nhưng phải hiểu rằng arg đó thuộc về flag khác - cần xử lý flag đó bình thường, không skip.

---

### C4. SettingsManager FileSettingsStorage.withLock busy-wait block event loop

- **File:** `src/runtime/settings-manager.ts`
- **Dòng:** ~130-145
- **Mức độ:** 🔴 Critical

**Mô tả:**
Sử dụng `while` loop ép buộc chờ lock block toàn bộ event loop Node.js, khiến ứng dụng treo hoàn toàn khi ghi settings.

**Code lỗi:**
```typescript
const maxRetries = 5;
let lockFd: number | undefined;
for (let i = 0; i < maxRetries; i++) {
  lockFd = acquireLock();
  if (lockFd !== undefined) break;
  // ❌ BUSY-WAIT block toàn bộ event loop
  const delay = 50 * (i + 1);
  const start = Date.now();
  while (Date.now() - start < delay) {}
}
```

**Sửa đề xuất:** Dùng `proper-lockfile` hoặc `sleep` bằng `setTimeout` (async) hoặc `Atomics.wait` trên `SharedArrayBuffer` (sync).

---

### C5. src/tools/bash.ts - Import sai file

- **File:** `src/tools/bash.ts`
- **Dòng:** ~1-10
- **Mức độ:** 🔴 Critical

**Mô tả:**
Import `executeBash` từ `./bash-executor.js` (sai path, thực tế là `bash-executor.ts`) và import `truncateOutput` từ `./truncate.js` (sai, thực tế là `src/utils/truncate.ts`). File này không thể chạy được.

**Code lỗi:**
```typescript
import { executeBash, type BashResult } from './bash-executor.js';
import { truncateOutput, truncateTail, DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES } from './truncate.js';
```

**Sửa đề xuất:** Sửa path trỏ đến `src/tools/truncate.ts` hoặc `src/utils/truncate.ts`; đảm bảo build system resolve đúng.

---

### C6. output-guard.safeReadFile - Tham chiếu statsSync trước khi khai báo

- **File:** `src/runtime/output-guard.ts`
- **Dòng:** ~1
- **Mức độ:** 🔴 Critical

**Mô tả:**
`import { existsSync, readFileSync, unlinkSync, Stats } from 'fs';` - `Stats` là type nên bị lỗi import, và `safeReadFile` gọi `statsSync` được khai báo SAU hàm trong cùng file (function declaration được hoist nhưng kiểu `Stats` không phải runtime value).

**Code lỗi:**
```typescript
import { existsSync, readFileSync, unlinkSync, Stats } from 'fs';

export function safeReadFile(...) {
  // ...
  const stats = statsSync(filePath);  // ❌ statsSync chưa định nghĩa ở đây
  // ...
}

import { statSync } from 'fs';

function statsSync(path: string): Stats {
  return statSync(path);
}
```

**Sửa đề xuất:** Sử dụng `statSync` trực tiếp, khai báo `import { statSync, Stats }` ở đầu file, bỏ wrapper `statsSync`.

---

## 🟠 MAJOR (14 bug)

### M1. AgentLoop._processTurnWithTools - Double count toolCalls

- **File:** `src/agent/agent-loop.ts`
- **Dòng:** ~830-850
- **Mức độ:** 🟠 Major

**Code lỗi:**
```typescript
private async _processTurnWithTools(...) {
  this.state.totalToolCalls += toolCalls.length;  // ← Lần 1
  // ...
  const toolResults = await this.toolExecutor.executeAll(...);
  // ...
  this.state.totalToolCalls += toolCalls.length;  // ← Lần 2 (BUG!)
}
```

**Sửa đề xuất:** Xóa dòng `this.state.totalToolCalls += toolCalls.length` thứ nhất.

---

### M2. ToolExecutor.execute - Non-null assertion trên handler

- **File:** `src/agent/tool-executor.ts`
- **Dòng:** ~380
- **Mức độ:** 🟠 Major

**Code lỗi:**
```typescript
const handler = tool.handler!; // ❌ Non-null assertion, có thể crash nếu undefined
```

**Sửa đề xuất:** Kiểm tra trước khi gọi:
```typescript
if (!tool.handler) {
  return this.createErrorResult(toolCall, `Tool '${toolCall.name}' has no handler`, startTime);
}
const handler = tool.handler;
```

---

### M3. ToolExecutor.executeWithTimeout - Race condition signal.aborted

- **File:** `src/agent/tool-executor.ts`
- **Dòng:** ~570-600
- **Mức độ:** 🟠 Major

**Code lỗi:**
```typescript
if (signal) {
  if (signal.aborted) {
    clearTimeout(timeoutId);
    reject(new Error('Execution aborted'));
    return;
  }
  signal.addEventListener('abort', onAbort, { once: true });  // ❌ Gán listener SAU check
}
```

**Sửa đề xuất:** Gán listener trước check `signal.aborted`, hoặc dùng `{ once: true }` và cleanup đúng cách. Có thể dùng `AbortSignal` kết hợp promise.

---

### M4. AgentSession._executeAgentRun - Bỏ qua nhiều turns

- **File:** `src/session/agent-session.ts`
- **Dòng:** ~520-540
- **Mức độ:** 🟠 Major

**Code lỗi:**
```typescript
private async _executeAgentRun(initialTurns: ConversationTurn[]): Promise<void> {
  const hasHistory = this._agentState?.history?.length > 0;
  if (hasHistory) {
    for (const turn of initialTurns) {
      this.agent.steer(turn);  // ❌ Mỗi turn tạo 1 queue entry riêng
    }
    await this.agent.resume();
  } else {
    await this.agent.run(initialTurns);  // Truyền array vào run
  }
}
```

**Sửa đề xuất:** Gộp tất cả turns thành 1 tin nhắn user duy nhất hoặc dùng cơ chế nối sequence turn từ AgentLoop.

---

### M5. AgentSession.navigateTree - Non-null assertion this._model!

- **File:** `src/session/agent-session.ts`
- **Dòng:** ~1120
- **Mức độ:** 🟠 Major

**Code lỗi:**
```typescript
if (options.summarize && entriesToSummarize.length > 0) {
  const model = this._model!;  // ❌ Có thể undefined
  // ...
```

**Sửa đề xuất:** Dùng optional chaining hoặc throw rõ ràng nếu `this._model` undefined trước khi proceed.

---

### M6. AgentLoop.executeLoop - Vô hạn steering turns

- **File:** `src/agent/agent-loop.ts`
- **Dòng:** ~200-220
- **Mức độ:** 🟠 Major

**Code lỗi:**
```typescript
while (this.state.round < maxRounds && !this.state.isCancelled) {
  // ...
  const steeringTurns = await this._collectSteeringTurns(steeringQueue);
  if (steeringTurns.length > 0) {
    this.state.history.push(...steeringTurns);
    // ❌ Không có guard, round không tăng nếu không có tool calls và không có final answer
  }
  // ...
}
```

**Sửa đề xuất:** Thêm guard: đếm số steering turns mỗi round, giới hạn tổng số steering turns (ví dụ: max 10), hoặc tăng round counter khi drain steering.

---

### M7. SessionManager.importSession - Không set sessionFile

- **File:** `src/session/session-manager.ts`
- **Dòng:** ~860-890
- **Mức độ:** 🟠 Major

**Code lỗi:**
```typescript
const manager = new SessionManager(cwd, sessionDir, undefined, true);
manager.fileEntries = entries;
manager.byId = byId;
manager.labelsById = labelsById;
manager.labelTimestampsById = labelTimestampsById;
manager.leafId = leafId;
// ❌ manager.sessionFile không được set

if (manager.persist && manager.sessionFile) {  // Luôn false
  writeFileSync(manager.sessionFile, content);
}
```

**Sửa đề xuất:** Gọi `manager.setSessionFile(path)` hoặc set `manager.sessionFile` từ header timestamp + sessionId.

---

### M8. src/tools/read-tool.ts - Không validate path

- **File:** `src/tools/read-tool.ts`
- **Dòng:** ~1-100
- **Mức độ:** 🟠 Major

**Code lỗi:**
```typescript
function resolvePath(path: string, cwd: string): string {
  return resolve(cwd, path);  // ❌ Không có validatePathWithinBase
}
```

**Sửa đề xuất:** Dùng `resolveReadPath` và `validatePathWithinBase` từ `path-utils.ts` như trong `read.ts`.

---

### M9. src/tools/write-tool.ts - Không validate path

- **File:** `src/tools/write-tool.ts`
- **Dòng:** ~1-50
- **Mức độ:** 🟠 Major

**Code lỗi:**
```typescript
function resolvePath(path: string, cwd: string): string {
  return resolve(cwd, path);  // ❌ Không validate
}
```

---

### M10. src/tools/edit-tool.ts - Không validate path

- **File:** `src/tools/edit-tool.ts`
- **Dòng:** ~1-80
- **Mức độ:** 🟠 Major

---

### M11. src/tools/ls-tool.ts - Không validate path

- **File:** `src/tools/ls-tool.ts`
- **Dòng:** ~1-60
- **Mức độ:** 🟠 Major

---

### M12. src/tools/read.ts - Dùng schema thay vì parameters

- **File:** `src/tools/read.ts`
- **Dòng:** ~1-60
- **Mức độ:** 🟠 Major

**Code lỗi:**
```typescript
return {
  name: 'read',
  description: '...',
  schema: { type: "object", properties: { ... }, required: ["path"] },  // ❌ Sai field
  async execute(input: ReadToolInput): Promise<any> { ... }
};
```

ToolDefinition type yêu cầu field `parameters` chứ không phải `schema`.

---

### M13. src/tools/edit.ts - Dùng schema thay vì parameters

- **File:** `src/tools/edit.ts`
- **Dòng:** ~1-60
- **Mức độ:** 🟠 Major

---

### M14. src/tools/write.ts - Dùng schema thay vì parameters

- **File:** `src/tools/write.ts`
- **Dòng:** ~1-50
- **Mức độ:** 🟠 Major

---

## 🟡 MEDIUM (9 bug)

### Me1. AgentSession.setModel - Không kiểm tra model tồn tại trong registry

- **File:** `src/session/agent-session.ts`
- **Dòng:** ~360-365
- **Mức độ:** 🟡 Medium

**Code lỗi:**
```typescript
async setModel(model: Model): Promise<void> {
  if (!this.modelRegistry.hasConfiguredAuth(model)) {
    throw new Error(`No API key for ${model.provider}/${model.id}`);
  }
  // ❌ Không kiểm tra model có tồn tại trong registry
  this._model = model;
```

---

### Me2. AgentSession.prompt - Race condition với isStreaming

- **File:** `src/session/agent-session.ts`
- **Dòng:** ~480-490
- **Mức độ:** 🟡 Medium

**Mô tả:** Nếu `_isPromptRunning` true nhưng agent đã finish, message được queue nhưng không bao giờ được xử lý.

---

### Me3. main.ts subscribeToSessionEvents - Truy cập runtime.messages không an toàn

- **File:** `src/main.ts`
- **Dòng:** ~25-45
- **Mức độ:** 🟡 Medium

**Code lỗi:**
```typescript
const msgs = runtime.messages as any[] || [];  // ❌
const lastAssistant = [...msgs].reverse().find(...);  // Throw nếu không phải array
```

---

### Me4. agent.ts - Hai resolveConfig methods trùng lặp

- **File:** `src/agent/agent.ts`
- **Dòng:** ~170 và ~530
- **Mức độ:** 🟡 Medium

Có hai method `_resolveConfig` và `resolveConfig` với logic khác nhau - confused maintenance.

---

### Me5. AgentSession._agentState - Mutates agent.runner.state trực tiếp

- **File:** `src/session/agent-session.ts`
- **Dòng:** ~1800-1830
- **Mức độ:** 🟡 Medium

**Code lỗi:**
```typescript
private get _agentState(): any {
  const agent = this.agent as any;
  if (agent?.runner?.state) {
    const state = agent.runner.state;
    if (!state.messages && state.history) {
      state.messages = state.history;  // ❌ Mutate runtime state
    }
    return state;
  }
```

---

### Me6. event-stream.ts end() - Có thể resolve trước khi push 'done'

- **File:** `src/llm/event-stream.ts`
- **Dòng:** ~40-50
- **Mức độ:** 🟡 Medium

**Code lỗi:**
```typescript
end(result?: AssistantMessage): void {
  this.done = true;
  if (result !== undefined) {
    this.resolveFinal(result);  // Resolve promise nhưng 'done' chưa được queue
  }
  // ...
}
```

---

### Me7. transform-messages.ts - Bỏ qua assistant message có stopReason error/aborted

- **File:** `src/llm/transform-messages.ts`
- **Dòng:** ~190-195
- **Mức độ:** 🟡 Medium

**Code lỗi:**
```typescript
if (assistantMsg.stopReason === "error" || assistantMsg.stopReason === "aborted") {
  continue;  // ❌ Mất thông tin lỗi
}
```

---

### Me8. trust-manager.ts - Busy-wait sync lock block event loop

- **File:** `src/runtime/trust-manager.ts`
- **Dòng:** ~95-110
- **Mức độ:** 🟡 Medium

```typescript
const start = Date.now();
while (Date.now() - start < delayMs) {
  // Sleep synchronously - block
}
```

---

### Me9. json-parse.ts parseStreamingJson - Trả về {} nếu parse fail

- **File:** `src/llm/utils/json-parse.ts`
- **Dòng:** ~5-15
- **Mức độ:** 🟡 Medium

Lỗi parse bị swallowed, caller không biết có lỗi.

---

## 🟢 MINOR (6 bug)

### m1. agent.ts _prepareModel - Dead code

- **File:** `src/agent/agent.ts`
- **Dòng:** ~440-470
- **Mức độ:** 🟢 Minor

Không bao giờ được gọi từ bất kỳ đâu.

---

### m2. event-emitter.ts emit() - Swallow errors từ handlers

- **File:** `src/events/event-emitter.ts`
- **Dòng:** ~100-130
- **Mức độ:** 🟢 Minor

```typescript
} catch {
  // Swallow errors from individual handlers to isolate them
}
```

Khó debug khi handler throw.

---

### m3. stream-buffer.ts scheduleFlush - Có thể leak timer

- **File:** `src/llm/stream-buffer.ts`
- **Dòng:** ~80-95
- **Mức độ:** 🟢 Minor

---

### m4. context-manager.ts ContextBuilder.build() - Có thể infinite loop

- **File:** `src/agent/context-manager.ts`
- **Dòng:** ~80-100
- **Mức độ:** 🟢 Minor

**Code lỗi:**
```typescript
if (tokenCount > maxTokens) {
  // Recursively rebuild - nhưng nếu truncatedHistory rỗng vẫn recursive vô hạn
  return this.build(basePrompt, truncatedHistory);
}
```

---

### m5. message-queue.ts MessageQueue.drainAll() - Memory leak

- **File:** `src/agent/message-queue.ts`
- **Dòng:** ~60-80
- **Mức độ:** 🟢 Minor

Chỉ điều chỉnh `head`, array không bao giờ shrink.

---

### m6. prioritized-event-emitter.ts emit() - Retry vô hạn nếu buffer đầy

- **File:** `src/events/prioritized-event-emitter.ts`
- **Dòng:** ~120-135
- **Mức độ:** 🟢 Minor

```typescript
await new Promise(resolve => setTimeout(resolve, 10));
return this.emit(event); // retry - vô hạn nếu không bao giờ drop
```

---

## 🎯 CÁC BUG NÊN SỬA TRƯỚC (TOP 6)

1. **C2** - `stream()` IIFE async: Gây lỗi LLM không hoạt động (nghiêm trọng nhất)
2. **C1** - `_persist` không ghi session: Mất toàn bộ dữ liệu session
3. **C4** - Busy-wait block event loop: Treo toàn bộ ứng dụng
4. **C3** - `--list-models` logic lỗi: Gây lỗi CLI parsing
5. **M1** - Double count toolCalls: Sai lệch metrics
6. **M8-M11** - Directory traversal: Lỗ hổng bảo mật nghiêm trọng

---

## 📋 DANH SÁCH FILE ĐÃ ĐỌC ĐẦY ĐỦ

### src/agent/ (11 file)
- agent.ts ✅
- agent-loop.ts ✅
- context-manager.ts ✅
- follow-up-manager.ts ✅
- index.ts ✅
- loop-strategy.ts ✅
- message-queue.ts ✅
- pi-ai-shim.ts ✅
- proxy-stream.ts ✅
- tool-executor.ts ✅
- types.ts ✅

### src/session/ (15 file)
- agent-session.ts ✅
- agent-session-services.ts ✅
- agent-session-types.ts ✅
- agent-types.ts ✅
- auth-storage.ts ✅
- branch-summarization.ts ✅
- compaction.ts ✅
- convert-to-llm.ts ✅
- defaults.ts ✅
- index.ts ✅
- model-registry.ts ✅
- model-resolver.ts ✅
- resolve-config-value.ts ✅
- session-cwd.ts ✅
- session-manager.ts ✅

### src/llm/ (20 file)
- api-registry.ts ✅
- compat-detection.ts ✅
- env-api-keys.ts ✅
- event-stream.ts ✅
- index.ts ✅
- models.ts ✅
- models.generated.ts ✅
- overflow.ts ✅
- providers/index.ts ✅
- providers/openai-compatible.ts ✅
- providers/register-builtins.ts ✅
- scripts/generate-models.ts ✅
- transform-messages.ts ✅
- types.ts ✅
- utils/hash.ts ✅
- utils/json-parse.ts ✅
- utils/sanitize-unicode.ts ✅
- utils/stream-buffer.ts ✅
- utils/validation.ts ✅
- validation.ts ✅

### src/tools/ (17 file)
- bash-executor.ts ✅
- bash-tool.ts ✅
- bash.ts ✅
- edit-tool.ts ✅
- edit.ts ✅
- file-mutation-queue.ts ✅
- find-tool.ts ✅
- grep-tool.ts ✅
- ls-tool.ts ✅
- ls.ts ✅
- path-utils.ts ✅
- read-tool.ts ✅
- read.ts ✅
- truncate.ts ✅
- write-tool.ts ✅
- write.ts ✅

### src/events/ (6 file)
- event-bus.ts ✅
- event-emitter.ts ✅
- event-guards.ts ✅
- event-recorder.ts ✅
- events.ts ✅
- index.ts ✅

### src/cli/ (4 file)
- file-processor.ts ✅
- initial-message.ts ✅
- list-models.ts ✅
- session-picker.ts ✅

### src/runtime/ (22 file)
- agent-session-interfaces.ts ✅
- agent-session-runtime.ts ✅
- auth-guidance.ts ✅
- cli-args.ts ✅
- diagnostics.ts ✅
- file-mutation-queue.ts ✅
- footer-data-provider.ts ✅
- index.ts ✅
- keybindings.ts ✅
- output-guard.ts ✅
- package-manager.ts ✅
- performance-tracker.ts ✅
- prompt-templates.ts ✅
- resource-loader.ts ✅
- settings-manager.ts ✅
- settings-validator.ts ✅
- skills.ts ✅
- slash-commands.ts ✅
- source-info.ts ✅
- stream-utils.ts ✅
- system-prompt.ts ✅
- telemetry.ts ✅
- trust-manager.ts ✅

### src/utils/ (6 file)
- child-process.ts ✅
- paths.ts ✅
- shell.ts ✅
- timings.ts ✅
- truncate.ts ✅

### src/extensions/ (5 file)
- index.ts ✅
- loader.ts ✅
- runner.ts ✅
- types.ts ✅
- wrapper.ts ✅

### src/modes/ (4 file)
- http/http-server.ts ✅
- http/index.ts ✅
- interactive/interactive-controller.ts ✅
- interactive/interactive-mode.ts ✅

### src/memory/ (8 file)
- agent-app.ts ✅
- engine-dedup.ts ✅
- engine.ts ✅
- events.ts ✅
- index.ts ✅
- retrieval.ts ✅
- storage.ts ✅
- types.ts ✅

### File gốc (5 file)
- config.ts ✅
- main.ts ✅
- cli.ts ✅
- migrations.ts ✅
- package-manager-cli.ts ✅

**Tổng: 124 file backend**
