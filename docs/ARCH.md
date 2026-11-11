# ARCH.md – Kiến trúc hệ thống Picro

> Tài liệu này mô tả toàn bộ kiến trúc của dự án `picro` – một AI coding agent chạy trên terminal.
> Viết dựa trên việc đọc toàn bộ mã nguồn (128 file TypeScript, ~32.400 dòng, không tính test).
> Không chứa đoạn mã nguồn; chỉ mô tả bằng lời và sơ đồ dạng text.

---

## 1. Picro là gì?

`picro` (package `@picro/picro`) là một **AI coding agent CLI** – trợ lý lập trình chạy trong terminal, tương tự Claude Code / Cursor CLI ở quy mô nhỏ. Nó:

- Nhận yêu cầu bằng ngôn ngữ tự nhiên (tiếng Việt có dấu được, vì toàn bộ luồng dữ liệu là UTF-8).
- Gọi LLM qua lớp OpenAI-compatible (hỗ trợ ~30 provider: OpenAI, Anthropic, Google, NVIDIA NIM, Groq, xAI, Cerebras, OpenRouter, DeepSeek, ZAI, Kimi, Copilot, Bedrock, Vertex…).
- Cho phép LLM gọi **tools** (đọc/ghi file, chạy bash, tìm kiếm) qua vòng lặp agent nhiều vòng cho đến khi có câu trả lời cuối.
- Lưu toàn bộ hội thoại dưới dạng **JSONL session** có cấu trúc cây (branching), cho phép resume/fork/navigate.
- Có **giao diện TUI** (Ink + React) và **HTTP API mode** (REST + WebSocket) như hai lớp trình bày thay thế cho cùng một bộ backend.

---

## 2. Sơ đồ kiến trúc tổng thể

```
┌──────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION                               │
│  ┌────────────────────┐    ┌──────────────────────────────────────┐  │
│  │  src/tui/ink/      │    │  src/modes/http/                     │  │
│  │  (Ink + React TUI) │    │  (REST + WebSocket server)           │  │
│  └────────┬───────────┘    └──────────────┬───────────────────────┘  │
│           │  props/callbacks              │  controller calls       │
│           ▼                               ▼                          │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  src/modes/interactive/interactive-controller.ts             │    │
│  │  InteractiveController – não của chế độ tương tác:           │    │
│  │  • giữ runtime, • slash commands, • trạng thái cho UI        │    │
│  └──────────────────────────┬───────────────────────────────────┘    │
│                             │ gọi API sạch                          │
│                             ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  src/runtime/  AgentSessionRuntime + AgentSessionServices    │    │
│  │  • settings, auth, model registry, resource loader           │    │
│  └──────────────────────────┬───────────────────────────────────┘    │
│                             │ sở hữu                                │
│                             ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  src/session/  AgentSession  (trạng thái hội thoại)          │    │
│  │    ├── SessionManager  (JSONL persistence, tree, labels)     │    │
│  │    ├── compaction / branch-summarization                     │    │
│  │    ├── auth-storage, model-registry, model-resolver          │    │
│  │    └── convert-to-llm (đổi message session → message LLM)    │    │
│  └──────────────────────────┬───────────────────────────────────┘    │
│                             │ điều phển                             │
│                             ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  src/agent/  Agent + AgentLoop + ToolExecutor                │    │
│  │  • vòng lặp ReAct, context builder, retry, hooks             │    │
│  └──────────┬───────────────────────────────┬───────────────────┘    │
│             │ gọi tool                     │ gọi LLM                │
│             ▼                             ▼                         │
│  ┌────────────────────┐   ┌─────────────────────────────────────┐    │
│  │  src/tools/        │   │  src/llm/                           │    │
│  │  read/write/edit/  │   │  OpenAI-compatible provider,        │    │
│  │  bash/ls/grep/find │   │  models, compat, overflow, transform│    │
│  └────────────────────┘   └─────────────────────────────────────┘    │
│                                                                      │
│  Cắt ngang:  src/events/ (event bus) · src/memory/ (retrieval engine)│
│              src/extensions/ (plugin API) · src/utils/ (shell, path) │
└──────────────────────────────────────────────────────────────────────┘
```

**Luật phân lớp:** Presentation không bao giờ chạm trực tiếp vào `AgentSession` hoặc `Agent`; nó chỉ nói chuyện với `InteractiveController`, controller chỉ nói chuyện với `AgentSessionRuntime`. Điều này cho phép thay thế UI (Ink → terminal thuần → web) mà không đụng vào lõi.

---

## 3. Entry point – luồng khởi động

File `src/main.ts` điều phển toàn bộ khởi động:

1. **Nạp biến môi trường** từ file `.env` ở cwd (parse thủ công, không dùng thư viện).
2. **Parse args** (`src/runtime/cli-args.ts`): các cờ `--provider`, `--model`, `--api-key`, `--session`, `--fork`, `--resume`, `--tools`, `--no-tools`, `--thinking`, `--mode` (tty mặc định, hoặc `http`), `--port`, `--host`, `--verbose`, `--offline`, `--list-models`, `--help`, `--version`. Cờ lạ được đưa vào `unknownFlags` để extension đăng ký (extension flag).
3. **Chạy migration** (`src/migrations.ts`): chuyển credential cũ (`oauth.json`, `settings.json.apiKeys`) sang `auth.json`; di chuyển session file rải rác về đúng thư mục theo cwd; đổi tên `commands/` → `prompts/`.
4. **Tạo services** (`createAgentSessionServices`): auth storage, settings manager (global ở `~/.pi/agent/settings.json` + project ở `<cwd>/.pi/settings.json`, merge sâu, khóa file chống ghi đồng thời), model registry, **resource loader** (quét extensions/skills/prompt-templates/themes/context files `AGENTS.md`, `CLAUDE.md`), extension runner.
5. **Chọn session**: `--no-session` (in-memory), `--fork`, `--session`, `--resume` (chọn từ danh sách), `--continue` (gần nhất), hoặc tạo mới. Session lưu tại `<agentDir>/sessions/<cwd-encoded>/<timestamp>_<id>.jsonl`.
6. **Tạo `AgentSession`** với model được giải quyết (từ CLI → session đang tiếp tục → settings mặc định). Model không bắt buộc – chế độ tương tác cho phép đăng nhập/chọn model sau.
7. **Bọc trong `AgentSessionRuntime`** (lớp façade cao nhất).
8. **Đẩy tin nhắn ban đầu** (file `@` arguments được đọc → trong `src/cli/file-processor.ts`: text file ghép vào prompt, ảnh detect bằng magic bytes và gửi kèm base64; message đấu tiên trong CLI args được `buildInitialMessage` nối vào).
9. **Chọn lớp trình bày:**
   - `--mode http` / `--mode rpc` → khởi động `src/modes/http/http-server.ts` (REST + WebSocket).
   - Mặc định → `src/modes/interactive/interactive-mode.ts` (tạo controller) rồi `src/tui/ink/interactive-app.tsx` render `<App>` bằng Ink.

Lưu ý: `src/cli.ts` chỉ là launcher dynamic-import `./main.js`, để CLI start nhanh.

---

## 4. Mô tả chi tiết từng module

### 4.1 `src/agent/` – Lõi agent (4.349 dòng)

| File | Vai trò |
|------|---------|
| `agent.ts` | `Agent`: façade công khai. Nhận model, danh sách tool, config. Dựng `ToolExecutor`, `ContextBuilder`, `LoopStrategyFactory`, hai `MessageQueue` (steering – tiêm giữa vòng, followUp – chạy sau khi agent dừng), và `AgentLoop`. Cung cấp `run`, `stream`, `resume`, `abort`, `steer`, `followUp`, `waitForIdle`, `registerTool`, `setModel`. Toàn bộ lời gọi LLM đi qua `_callWithRetry` với exponential backoff + jitter; chỉ retry lỗi mạng và 5xx/429, AbortError ném ngay. |
| `agent-loop.ts` | `AgentLoop`: trái tim. Vòng lặp: thu steering → build context → gọi LLM (stream hoặc complete) → nếu có toolCalls thì `ToolExecutor.executeAll` rồi nối toolResult vào history → lặp lại; nếu hết toolCalls thì trả `AgentRunResult`. Quản lý `AgentRuntimeState` (round, totalToolCalls, history…), hook `prepareNextTurn`, hook `getSteeringMessages`/`getFollowUpMessages`, emits toàn bộ `agent:start`, `message:start/update/end`, `tool:call:*`, `llm:*`, `agent:end`. **Bảo vệ bộ nhớ:** `MAX_TOOL_TURNS = 1000` và `MAX_TOOL_RESULTS = 1000` — vượt ngưỡng sẽ loại bỏ lần lượt từ cũ nhất (guard OOM cho session cực dài). |
| `types.ts` | Toàn bộ kiểu dữ liệu: `ConversationTurn` (system/user/assistant/tool), content blocks, `AgentConfig`, `ToolDefinition`, hooks (`beforeToolCall`, `afterToolCall`, `shouldStopAfterTurn`, `prepareNextTurn`), `SessionMetrics`, `LLMStreamEvent`. |
| `tool-executor.ts` | `ToolExecutor`: registry tool, thực thi tuần tự hoặc song song (mặc định song song; ép tuần tự nếu config hoặc tool đánh dấu `executionMode: 'sequential'`). Timeout mỗi tool, cache kết quả theo (tên + JSON args) với LRU eviction, retry tool với phân loại lỗi retryable (mạng, 5xx, 429), emit progress. Validate arguments bằng JSON Schema đơn giản trước khi chạy. |
| `context-manager.ts` | `ContextBuilder`: ước token (4 chars/token), cắt history để vừa `maxTokens - reservedTokens`, luôn giữ system + N message gần nhất. |
| `loop-strategy.ts` | 5 chiến lược vòng lặp: ReAct (mặc định), PlanSolve, Reflection, Simple, SelfRefine. Mỗi strategy định nghĩa `shouldContinue`, `formatResults`, `transformPrompt`. |
| `message-queue.ts` | `MessageQueue` dùng mảng + head index (không shift), ép buộc nén mảng khi head quá lớn để tránh rò rỉ bộ nhớ. |
| `follow-up-manager.ts` | Gom follow-up turns từ queue + hook tùy chọn. |
| `proxy-stream.ts` | `createProxyStream`: luồng streaming qua HTTP POST server trung gian (SSE `data:` lines). Gần như legacy. |
| `pi-ai-shim.ts` | Tương thích kiểu Usage + `isContextOverflow` từ api cũ. |
| `index.ts` | Barrel export toàn bộ public API của tầng agent (kèm re-export events/extensions cho tiện dùng). |

### 4.2 `src/llm/` – Tầng LLM (6.862 dòng)

| File | Vai trò |
|------|---------|
| `providers/openai-compatible.ts` | Provider duy nhất: `buildParams` (ghép system prompt vào role system/developer tùy compat; map tool schema sang function calling; xử lý reasoning effort theo `thinkingFormat`; OpenRouter cache control; `stream_options.include_usage`), `stream` (gọi OpenAI SDK, parse SSE chunk thành event `start/text_*/thinking_*/toolcall_*/done/error` qua `AssistantMessageEventStream`), `complete` (bọc stream để lấy message cuối). |
| `models.generated.ts` | ~4.700 dòng dữ liệu model (do `scripts/generate-models.ts` sinh ra): danh sách model theo provider kèm giá, contextWindow, maxTokens, khả năng reasoning. **File sinh tự động – không sửa tay.** |
| `models.ts` | Tra cứu `getModel/getProviders/getModels`, `calculateCost` (tính tiền theo giá/million token), `supportsXhigh`. |
| `env-api-keys.ts` | Giải API key theo thứ tự: options → env var theo provider → `secrets.json` → `~/.pi/agent/auth.json` / `~/.picro/agent/auth.json` / `./auth.json` → fallback chung. Có `ENV_VAR_MAP` ~30 provider. |
| `api-registry.ts` | Registry singleton giữ client `OpenAI` theo (provider, model, baseUrl, key) để tái sử dụng kết nối. |
| `compat-detection.ts` | 15 cờ tương thích tự nhận diện theo provider/baseUrl/model (Cerebras, xAI/Grok, ZAI, Groq, OpenRouter, chutes…): vai trò developer, tên tham số max_tokens, cách gửi reasoning, thinkingFormat. Người dùng có thể ghi đè bằng `model.compat`. |
| `transform-messages.ts` | Chuẩn hóa message trước khi gửi: hạ cấp ảnh nếu model không hổ trợ vision (thay bằng placeholder text), normalize tool-call id (bỏ ký tự lạ, cắt 64 ký tự, xử lý phân tách bằng `|`), giữ/ép thinking block theo cùng/khác model, chèn synthetic tool result cho tool call mồ côi. `transformAssistantMessages` lọc assistant rỗng. |
| `overflow.ts` | Ước token và cắt bớt message cũ nhất để vừa `contextWindow - reservedOutput`; giữ system prompt nguyên vẹn; cắt system prompt thành snippet nếu quá dài. |
| `event-stream.ts` | `AssistantMessageEventStream`: hàng đợi async + promise kết quả cho pattern producer/consumer streaming. |
| `validation.ts`, `utils/*` | Validate JSON Schema tối giản cho tool arguments/model config; `parseStreamingJson` (parse JSON dở dang khi stream tool arguments); `sanitizeSurrogates` (surrogate UTF-8); `StreamBuffer` (đệm chunk theo provider); `hash.ts` (hash messages/ fingerprint request cho cache). |

### 4.3 `src/session/` – Trạng thái hội thoại (6.448 dòng)

| File | Vai trò |
|------|---------|
| `agent-session.ts` | `AgentSession` (2.275 dòng – lớn nhất): sở hữu `Agent`, điều phển `prompt()` (validate model + auth, xây user turn, flush bash messages), `steer`/`followUp` (hàng đợi có kiểm soát tắc nghẽn, đuổi message cũ nhất khi quá giới hạn), compaction thủ công/tự động, navigateTree (branch + tùy chọn tóm tắt nhánh bỏ bằng LLM), model cycling (scoped hoặc tất cả model khả dụng), thinking level clamping theo model, auto-retry khi lỗi quá tải/timeout (theo `RetrySettings`), ghi message vào session file, chuyển tiếp agent event (colon → underscore) cho UI, emit event cho extension runner. |
| `session-manager.ts` | `SessionManager` (1.191 dòng): định dạng JSONL version 3 với các entry: `session` header, `message`, `thinking_level_change`, `model_change`, `compaction`, `branch_summary`, `label`, `custom`, `custom_message`. Duy trì cây `parentId`, leaf, index; `buildSessionContext` đi từ leaf về root, ghép compaction summary + các message còn lại, convert sang LLM messages. Hỗ trợ: tạo/mở/import JSONL, rename, export HTML/JSONL (stub), `listStale`, migrating bản ghi cũ. |
| `compaction.ts` | Nén ngữ cảnh: thu thập entry nhánh, tìm cut point an toàn (không cắt giữa tool call/result), ước token từ usage hoặc heuristic, `shouldCompact` theo ngưỡng so với contextWindow, tóm tắt bằng LLM (stub `performCompaction`). |
| `branch-summarization.ts` | Tương tự compaction nhưng cho nhánh bị bỏ khi navigateTree; theo dõi file operations (read/written/edited) để đưa vào prompt tóm tắt. |
| `convert-to-llm.ts` | Map message đặc thù của session (`bashExecution`, `branchSummary`, `compactionSummary`, `custom`) sang `Message[]` của tầng LLM. |
| `auth-storage.ts` | Lưu credential (api_key / oauth) trong `auth.json`, quyền 600. |
| `model-registry.ts` | Ánh xạ model → auth status; `getApiKeyAndHeaders`; danh sách model khả dụng. |
| `model-resolver.ts` | Parse pattern model (`provider/id:thinking`), resolve scope cho Ctrl+P cycling, model mặc định per provider, khôi phục model từ session. |
| `agent-session-types.ts` | Kiểu session: config, event union (queue_update, compaction_*, auto_retry_*, session_tree…), stats. |
| `session-cwd.ts` | Phát hiện session mở lại ở cwd khác → hỏi fork hoặc dùng cwd hiện tại. |
| `agent-session-services.ts` | `createAgentSessionServices` (các service theo cwd) + `createAgentSessionFromServices` (build `Agent` với built-in tools, khôi phục history). |

### 4.4 `src/runtime/` – Ứng dụng & hạ tầng (5.784 dòng)

| File | Vai trò |
|------|---------|
| `agent-session-runtime.ts` | `AgentSessionRuntime`: façade cao nhất, sở hữu session + services, expose ~40 delegate (messages, compact, navigateTree, cycleModel, listSessions, switchSession, fork, dispose…). |
| `settings-manager.ts` | Cài đặt global/project với deep merge, khóa file (tự tạo `.lock`, phát hiện stale lock bằng PID), schema validation ajv, ~60 thuộc tính (provider, model, theme, compaction, retry, disabledTools, shellPath, packages…). |
| `resource-loader.ts` | Quét và tải: extensions, skills (`SKILL.md` + frontmatter), prompt templates (đổi `$ARGUMENTS`), themes, context files (`AGENTS.md`, `CLAUDE.md`). |
| `system-prompt.ts` | Dựng system prompt: nhánh custom prompt riêng, nhánh mặc định (guidelines theo tool khả dụng, ví dụ khuyên dùng grep/find/ls thay bash khi có), mốc ngày, cwd, context files, skills. |
| `skills.ts` | Load/validate skill từ file/thư mục, giới hạn độ dài name/description. |
| `prompt-templates.ts` | Template markdown với thay thế đối số (`$1`, `$@`, `$ARGUMENTS`). |
| `slash-commands.ts` | Danh sách slash command built-in (~27 lệnh) cho help/autocomplete. |
| `keybindings.ts` | Quản lý phím tắt (mặc định + override từ file). |
| `footer-data-provider.ts` | Dữ liệu cho footer: nhánh git, dirty state, extension status, session info. |
| `package-manager.ts` | Cài/gỡ package extension (npm/git source). |
| `output-guard.ts` | Kiểm tra và vệ sinh output (giới hạn kích thước, ký tự điều khiển) trước khi hiển thị. |
| `telemetry.ts` | Ghi sự kiện telemetry (được gating bởi `enableInstallTelemetry`). |
| `performance-tracker.ts` | Lấy mẫu CPU/heap theo chu kỳ. |
| `trust-manager.ts` | Quyết định tin cậy project (theo đường dẫn lân cận), lưu vào file trust. |
| `prompt-templates.ts` | Nạp template + thay thế đối số. |
| `cli-args.ts` | Parse CLI (xem mục 3). |
| `file-mutation-queue.ts` | Hàng đợi atomic cho ghi/edit nhiều file (rollback bằng snapshot). |
| `truncate.ts`, `stream-utils.ts`, `source-info.ts`, `auth-guidance.ts`, `settings-validator.ts`, `diagnostics.ts`, `index.ts` | Tiện ích nội bộ và barrel export. |

### 4.5 `src/tools/` – Tools cho LLM (2.130 dòng)

- **`read`**: đọc file kèm offset/limit, chống đọc ngoài cwd, fallback xử lý tên file macOS (NFD, dấu cách hẹp, curly quote cho screenshot).
- **`write`**: ghi/ghi đè file (tạo thư mục cha nếu cần).
- **`edit`**: thay thế chuỗi `oldString → newString`, hỗ trợ `dryRun`.
- **`bash`**: spawn shell (tìm `bash`/`bash.exe` cross-platform, hoặc shell cấu hình), detached group, timeout, abort, cắt output 50KB/2000 dòng (mặc định truncate util), kill cả process tree.
- **`ls`**: liệt kê thư mục (đệ quy, ẩn, metadata).
- **`grep`** / **`find`**: chạy `rg` / `fd`/`find` (spawn external), parse JSON output, glob filter, context lines, giới hạn số match.
- **`path-utils.ts`**: bảo mật mọi path tool — expand `~`, resolve theo cwd, `validatePathWithinBase` chống directory traversal.
- **`file-mutation-queue.ts`**: đợi/ghi atomic cho batch edit.
- **`truncate.ts`**: cắt head/tail/lines với marker.

Lưu ý kỹ thuật: có **hai bộ file tool song song** — bộ dài (`read-tool.ts`, `write-tool.ts`, `edit-tool.ts`, `bash-tool.ts`, `ls-tool.ts`, `grep-tool.ts`, `find-tool.ts`) là implementation đầy đủ; bộ ngắn (`read.ts`, `write.ts`, `edit.ts`, `bash.ts`, `ls.ts`) được `agent-session-services.ts` dùng để đăng ký built-in tool. Đây là di sản lịch sử (legacy), cần hợp nhất về một bộ.

### 4.6 `src/modes/` – Các lớp trình bày (772 dòng)

- **`interactive/interactive-mode.ts`**: entry thuần TypeScript. Tạo runtime → tạo `InteractiveController`. Không import Ink.
- **`interactive/interactive-controller.ts`** (~455 dòng): não UI. Giữ `messages`, `status`, `modal`, `toasts` cạnh UI không sợ mất trạng thái. Xử lý slash commands: `/quit`, `/exit`, `/thinking`, `/login`, `/help`, `/copy`, `/resume`, `/new`, `/settings`, `/model`, `/compact`, `/sessions`, `/clear`, `/history`, `/theme`, `/tools`, unknown → toast. Subscribe agent event → cập nhật processing, append assistant message, error toast. Phát callback `onMessage`, `onStatusChange`, `onToast`, `onModalChange`.
- **`http/http-server.ts`**: REST + WebSocket server. Endpoint: `/health`, `/sessions`, `/prompt`, `/messages`, `/status`. WebSocket: `prompt`, `get_messages`, `get_status`, `command`. Dùng chung controller với UI.

### 4.7 `src/tui/ink/` – Giao diện Ink (16 file TSX, ~1.180 dòng)

- **`interactive-app.tsx`**: render `<App runtime controller initialMessage />` bằng `ink`.
- **`App.tsx`**: root component, `useWindowSize` cho viewport, điều phẹn props + gọi controller; xử lý Ctrl+C; input submit → `controller.sendMessage`.
- **Components:**
  - `Header.tsx` – tiêu đề + cwd.
  - `Footer.tsx` – model, token, context, cwd; refresh mỗi 2 giây từ runtime.settings.
  - `MessageList.tsx` – danh sách tin nhắn; assistant message render bằng **`MarkdownRenderer.tsx`** (parser markdown tự viết bằng regex: heading, bold, italic, inline code, code block, list, link, quote; in ANSI màu).
  - `VirtualMessageList.tsx` – chỉ render tin nhắn trong viewport; hỗ trợ cuộn bằng mũi tên/PageUp/PageDown/Home/End; vim keys `j/k/J/K`; search (Ctrl+F trong tương lai, `n/N` điều hướng kết quả).
  - `Input.tsx` – dùng `useInput`; Ctrl+C/K/P/L; backspace; ký tự in được.
  - `Modal.tsx` – các dialogue: help, thinking, login, confirmation, settings, session-selector, model-selector, theme-selector.
  - `SessionSelector.tsx`, `SettingsSelector.tsx`, `ModelSelector.tsx`, `ThemeSelector.tsx` – selector tương tác dùng `useInput` (↑/↓, Enter, Ctrl+C).
  - `Keybindings.tsx` – bảng phím tắt.
  - `StatusBar.tsx`, `Toast.tsx` – thanh trạng thái, thông báo.
  - `theme.ts` – bộ màu ANSI + `formatTokens`, `formatCwdForFooter`, `sanitizeStatusText`, `truncateToVisualLines`.

### 4.8 `src/memory/` – Memory engine (1.707 dòng)

- `storage.ts`: `MemoryStore` – file JSON (nén gzip tự động khi lưu), CRUD, `memoryHash` (sha256 cắt 12 ký tự), `updateMemory` tăng access_count. `MemoryStorage` bọc giới hạn `maxMemories`.
- `retrieval.ts`: `MemoryScorer` (keyword + synonym map, term frequency, exact phrase, filePath +path metadata, project filter zero, penalty sai action type, recency boost theo bậc giờ, bonus độ dài ngắn và access count) + BM25 cho candidate. `MemoryRetriever` có cache 5 phút, metrics hit/miss, profiling latency p95.
- `engine-dedup.ts`: similarity theo token Jaccard, `detectDuplicate` trước khi ghi.
- `engine.ts`: `MemoryEngine` – orchestrator: add (auto forgetting theo ngày), recall, project switching, context string cho prompt, metrics; buffer sự kiện.
- `events.ts`: `MemoryEventLog` (SAVE/RECALL/DELETE) cho audit.
- `agent-app.ts`: `AgentMemoryApp` – wrapper API cao (`rememberFileRead/rememberCommand/recall...`).
- **Trạng thái tích hợp:** hiện module memory là độc lập; `AgentLoop` có sẵn hook `memoryBoosting` và event `memory:retrieve` nhưng session/agent chưa nối engine vào. Đây là hạng mục roadmap.

### 4.9 `src/extensions/` – Hệ plugin (1.246 dòng)

- `types.ts`: `Extension` (tools/commands/flags), `ExtensionAPI` (sendMessage, registerTool, setActiveTools, showDialog, getConfig, registerKeybinding…), `ExtensionSession`, event types cho session lifecycle (`session_start`, `before_agent_start`, `tool_call`, `tool_result`, `session_before_tree`…), `InputEventResult` (cho phép chặn/transform input).
- `loader.ts`: import extension file (ESM), `discoverAndLoadExtensions` quét thư mục + `packages` trong settings, `loadExtensionFromFactory` gọi `ExtensionFactory`.
- `runner.ts`: `ExtensionRunner` – đăng ký handler theo event type, emit tuần tự (bắt lỗi từng handler), expose command/tool, quản lý flag values, pending provider registrations, UI/command context binding, `emitSessionShutdownEvent`.
- `wrapper.ts`: chuyển `AgentTool` → `ToolDefinition`.

### 4.10 `src/events/` – Hệ event (1.096 dòng)

- `event-emitter.ts`: `EventEmitter` typed + global listeners, emit await tất cả async handler (cô lập lỗi từng handler), metrics count/duration per type.
- `prioritized-event-emitter.ts`: hàng đợi 4 mức ưu tiên (CRITICAL → LOW), buffer 1000, tùy chọn drop low priority; map mặc định (error = critical, agent start/end = high, queue_update = low…).
- `event-bus.ts`: controller + view bus đơn giản.
- `event-recorder.ts`: ghi lại event (cho replay/debug).
- `event-guards.ts`: 15 type guard + object `eventGuards`.
- `events.ts`: định nghĩa `AgentEvent` union cho toàn bộ tầng agent (trùng lặp với `agent/types.ts` – di sản, nên thống nhất).

### 4.11 `src/utils/`, root files

| File | Vai trò |
|------|---------|
| `utils/truncate.ts` | Cắt text theo 2000 dòng/50KB + `formatSize`, `truncateLine`. Dùng cho tool output và UI. |
| `utils/shell.ts` | Cross-platform shell resolution, `getShellEnv`, sanitize binary output, track/kill detached children (tránh zombie sau khi abort). |
| `utils/paths.ts` | `isLocalPath`. |
| `utils/timings.ts` | Đo thời gian startup, `printTimings` in bảng phân bổ thời gian khi `--verbose`. |
| `utils/child-process.ts` | Promise hóa `close` event. |
| `config.ts` | `APP_NAME`/`CONFIG_DIR_NAME`/`VERSION` (đọc từ `package.json`), đường dẫn agent dir (`~/.pi/agent` mặc định, override qua env), sessions/settings/auth/models path. |
| `migrations.ts` | Xem mục 3. |
| `package-manager-cli.ts` | `picro install/remove/update/list` cho package extension. |

---

## 5. Các luồng dữ liệu quan trọng

### 5.1 Một prompt hoàn chỉnh
`Input.submit` → `controller.sendMessage` → append user message → `runtime.prompt` → `AgentSession.prompt` (validate + build turn) → `agent.run/resume` → **`AgentLoop` vòng lặp**: build context (`ContextBuilder` hoặc `convertToLlm`) → `llm/stream` (SSE) → emit `message:*` → có toolCall? → `ToolExecutor.executeAll` (song song mặc định) → append toolResult → vòng tiếp; hết tool → `AgentRunResult` → `agent:end` → session append message vào JSONL → UI cập nhật qua event.

### 5.2 Streaming
`llm/stream` gọi OpenAI SDK, mỗi chunk được map thành event `text_delta`/`thinking_delta`/`toolcall_delta`; `AssistantMessageEventStream` đóng vai producer cho consumer trong AgentLoop; AgentLoop lại emit `message:update` lên session; UI có thể render incremental.

### 5.3 Persistence
Mỗi message/tool turn/thay đổi model/thinking level/compaction/label đều là một entry JSONL append vào session file; `buildSessionContext` dựng lại lịch sử từ leaf khi resume. Cây branch dựa trên `parentId`.

### 5.4 Retry & compaction
Khi `agent:end` với assistant cuối mang lỗi retryable (overloaded, 429, timeout…), session tạo retry promise, delay theo settings, gọi `agent.resume()`; nếu vượt attempts → `auto_retry_end` success=false. Khi context vượt ngưỡng hoặc LLM báo overflow → `prepareCompaction` → ghi entry `compaction` → rebuild history → (nếu overflow) resume lại.

### 5.5 Model & tools switching
Đổi model ghi entry `model_change`, cập nhật settings mặc định, clamp thinking level. Bật/tắt tool rebuild system prompt (`_buildSystemPrompt`) qua `setActiveToolsByName`.

### 5.6 Extensions
Extension đăng ký handler; `AgentSession` chuyển tiếp event đã convert cho runner; các handler có thể chặn input, đăng ký tool/command/provider, chèn UI dialog, tóm tắt branch tùy chỉnh. `ExtensionRunner` quản lý flag của extension (`--no-extensions`, `-e`).

---

## 6. Quyết định thiết kế chính & đánh đổi

1. **Facade phân lớp nghiêm ngặt** (`Runtime → Controller → UI`): đổi UI không đụng lõi; đổi UI (Ink↔HTTP) chỉ khác entry point.
2. **Chỉ một provider LLM (OpenAI-compatible)** + compat matrix: viết một lần, dùng cho mọi provider; trade-off: provider có hành vi lạ cần chỉnh model config bằng tay.
3. **Session là source of truth** (JSONL append-only): dễ audit/debug; trade-off: mỗi lần resume phải parse toàn bộ file.
4. **Tools chạy out-of-process** (spawn `rg`, `fd`, bash): an toàn, cross-platform; trade-off: phụ thuộc binary hệ thống.
5. **Memory engine độc lập, chưa nối**: code đã viết và test kỹ (BM25 + heuristic scoring), nhưng chưa đưa vào luồng agent — cố ý để tránh phình context.
6. **Không phụ thuộc Ink trong logic**: `interactive-controller.ts` thuần TS nên test được bằng vitest không cần render.

---

## 7. Nợ kỹ thuật / vấn đề đã biết

- **Hai bộ file tool song song** (ví dụ `read.ts` vs `read-tool.ts`) — nên gộp.
- **Duplication định nghĩa event** giữa `agent/types.ts` và `events/events.ts` — nên thống nhất một nguồn.
- **`AgentSession` quá lớn** (2.275 dòng) — cần tách compaction/retry/model-management ra service riêng.
- **`tsconfig.json` exclude `**/*.test.ts`** nhưng chưa exclude `**/*.test.tsx` — file test TSX sẽ bị tsc type-check khi build (thiếu `useInput` v.v. trong một số phiên bản). Nên thêm `**/*.test.tsx` vào exclude hoặc fix type của test.
- **`compaction.ts`/`branch-summarization.ts` trùng lặp** logic extract/estimate — nên gộp module dùng chung.
- **`proxy-stream.ts`** gần như legacy — cân nhắc xóa nếu không dùng.
- **Compaction summarization là stub** (`performCompaction`) — cần gọi LLM thật để tóm tắt.
- **Memory chưa integrated**; UI modal chưa gắn `onConfirm/onCancel` thật với selector.
- **Test suite có 3 test fail pre-existing** do Node API thay đổi (`rmdirSync` recursive option) trong `keybindings.test.ts`; 1 fail trong `file-mutation-queue.branches.test.ts` và 1 trong `cli-args.branches.test.ts` — không liên quan đường chính nhưng cần dọn.

---

## 8. Build, test, vận hành

- **Build:** `npm run build` → `tsc` (TypeScript -> `dist/`) + `chmod +x dist/cli.js`. Đầu ra là ESM Node 20+.
- **Test:** `npm test` → vitest (jsdom). 158 file test, 2.483 test case. Coverage script: `test:coverage:single`.
- **Chạy TUI:** `node dist/cli.js` (hoặc `picro` khi cài global).
- **Chạy HTTP mode:** `node dist/cli.js --mode http --port 3000`.
- **Khả quan:** 985 commit lịch sử, bắt đầu từ monorepo (packages/agent, packages/coding-agent, packages/llm, packages/memory, packages/tui) sau đó gộp về single package layout hiện tại (agent, cli, events, extensions, llm, memory, modes, runtime, session, tools, tui, utils).

---

## 9. Bản đồ tệp tham khảo nhanh

| Muốn tìm… | Xem |
|-----------|-----|
| Vào cửa chương trình | `src/main.ts`, `src/cli.ts`, `src/config.ts` |
| Luồng 1 prompt | `src/modes/interactive/interactive-controller.ts` → `src/session/agent-session.ts` → `src/agent/agent.ts` → `src/agent/agent-loop.ts` |
| Gọi LLM | `src/llm/providers/openai-compatible.ts` |
| Lưu session | `src/session/session-manager.ts` |
| Tool cho LLM | `src/session/agent-session-services.ts` (đăng ký), `src/tools/*` |
| Giao diện | `src/tui/ink/App.tsx` + `components/` |
| HTTP API | `src/modes/http/http-server.ts` |
| Cài đặt người dùng | `src/runtime/settings-manager.ts` |
| Extension | `src/extensions/runner.ts`, `loader.ts`, `types.ts` |
| Memory | `src/memory/engine.ts`, `retrieval.ts`, `storage.ts` |

---

*Tài liệu này là một phần của bộ ba tài liệu dự án: `AGENTS.md` (quy ước làm việc), `ARCH.md` (kiến trúc – file này), `GOAL.md` (mục tiêu và lộ trình).*
