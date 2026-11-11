# AGENTS.md – Hướng dẫn làm việc trong repo `picro`

> File này là "luật chơi" cho mọi AI agent (và con người) tham gia phát triển `picro`.
> Đọc kỹ trước khi sinh hoặc sửa bất kỳ file nào. Kiến trúc chi tiết ở `docs/ARCH.md`; mục tiêu ở `docs/GOAL.md`.

---

## 1. Sứ mệnh

`picro` là AI coding agent CLI: nhận yêu cầu tự nhiên, gọi LLM qua nhiều provider, dùng tools (read/write/edit/bash/ls/grep/find) qua vòng lặp agent, lưu hội thoại dạng JSONL có branch, trình bày qua Ink TUI hoặc HTTP API.

---

## 2. Bản đồ repo (chỉ dẫn)

```
src/
  main.ts                  # entry: args → services → session → runtime → mode
  cli.ts                   # launcher mỏng, dynamic import ./main.js
  config.ts                # APP_NAME/CONFIG_DIR_NAME/VERSION + đường dẫn agent dir
  migrations.ts            # migrate auth/sessions/commands cũ khi khởi động
  package-manager-cli.ts   # picro install/remove/update/list
  agent/                   # Agent, AgentLoop, ToolExecutor, ContextBuilder, strategies
  llm/                     # provider OpenAI-compatible, models, compat, overflow, utils
  session/                 # AgentSession, SessionManager (JSONL), compaction, auth, resolver
  runtime/                 # AgentSessionRuntime, services, settings, resources, slash cmds
  tools/                   # built-in tools cho LLM + path-utils + truncate
  modes/interactive/       # InteractiveMode (thuần TS) + InteractiveController
  modes/http/              # REST + WebSocket server dùng chung controller
  tui/ink/                 # Ink + React: App.tsx, interactive-app.tsx, components/
  memory/                  # memory engine (storage, scorer, retriever, dedup) – độc lập
  extensions/              # hệ plugin: types, loader, runner, wrapper
  events/                  # EventEmitter, PrioritizedEventEmitter, EventBus, guards
  utils/                   # truncate, shell, timings, paths, child-process
docs/                      # SYSTEM.md-style docs: ARCH.md, GOAL.md, PROJECT_STATE, TODO...
```

---

## 3. Quy tắc bắt buộc

### 3.1 Ngôn ngữ giao tiếp
- Trả lời và comment bằng **tiếng Việt** là chấp nhận được; comment code hiện có hỗnợp việt/anh — giữ phong cách file đang sửa.

### 3.2 Module system
- ESM nghiêm ngặt: **import nội bộ trong TS phải có đuôi `.js`** (`import { AgentSession } from "./session/agent-session.js"`), dù file nguồn là `.ts`. Đây là yêu cầu của `moduleResolution: nodenext`.
- Component React dùng `.tsx`; file logic dùng `.ts`.

### 3.3 Phân lớp – không được vi phạm
- **UI chỉ nói chuyện với `InteractiveController`**, controller chỉ nói chuyện với `AgentSessionRuntime`. Component Ink (`src/tui/ink/**`) không được import trực tiếp `agent-session.ts`, `agent-loop.ts`.
- `interactive-controller.ts` **không được import Ink/React** (phải giữ thuần TS để test không cần render).
- `session/` và `agent/` không import `tui/`, `modes/`.

### 3.4 Session & persistence
- Mọi thay đổi trạng thái hội thoại phải đi qua `SessionManager.appendMessage/appendModelChange/appendCompaction/...` (JSONL), không được mutate trực tiếp ngoài kênh này.
- Khi resume, luôn dựng lại lịch sử qua `buildSessionContext`, không tự đọc file.

### 3.5 Tools
- Mọi path trong tool phải qua `path-utils.ts` (`resolveReadPath`/`resolveToCwd` + `validatePathWithinBase`). Cấm nối chuỗi path thô.
- Tool output phải qua `truncate` (head/tail) trước khi trả LLM.

### 3.6 Sinh mã tự động
- `src/llm/models.generated.ts` do `src/llm/scripts/generate-models.ts` sinh ra. **Không sửa tay** — sửa script/config rồi chạy lại.
- Message/kiểu event: ưu tiên mở rộng kiểu đang dùng, tránh tạo song song trùng lặp.

---

## 4. Lệnh dùng hằng ngày

```bash
npm run build         # tsc + chmod dist/cli.js  (bắt buộc pass trước khi commit)
npm test             # vitest run (158 file test)
npm run test:watch    # vitest watch
npm run test:coverage:single

node dist/cli.js                      # chạy TUI (Ink)
node dist/cli.js --mode http --port 3000   # chạy HTTP API
node dist/cli.js --list-models        # kiểm tra model registry
```

Quy ước: **build pass + test không regress** là điều kiện đủ để commit. Fail pre-existing được phép ghi nhận trong `docs/TODO.md` (xem mục "Known failures") nhưng không được làm tăng thêm.

---

## 5. Workflow chuẩn (bám theo AUTO-CONTINUE.md)

1. **Đọc trước khi viết:** đọc `docs/ARCH.md` để biết file nào sửa; đọc `docs/TODO.md` để biết task ưu tiên.
2. **Plan → verify:** task lớn phải nêu rõ (a) file đọc, (b) file sửa/tạo, (c) cách kiểm chứng (test/build).
3. **Implement nhỏ nhất đủ:** không thêm dependency nếu utils nội bộ đủ dùng.
4. **Test/build** ngay sau mỗi thay đổi có rủi ro (agent, session, runtime, llm).
5. **Cập nhật docs**: `docs/TODO.md` (task done/next), `docs/PROJECT_STATE.md` (tổng quan), nếu là thay đổi kiến trúc thì cập nhật `docs/ARCH.md`.
6. **Commit** message convention: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:` — mô tả ngắn + lý do.

---

## 6. Testing – điều phải biết

- 158 file test / 2.483 case; framework vitest + jsdom.
- Mock LLM bằng cách inject `llmComplete`/`llmStream` vào `AgentConfig`; mock runtime bằng object thuần với `session.subscribe`, `settings`, `sessionManager` (xem `src/modes/interactive/interactive-controller.test.ts` làm mẫu).
- **Không hydrate UI thật trong test controller** — test controller bằng cách gọi `runCommand`/`sendMessage` rồi assert qua getter (`getMessages`, `getToasts`, `getModal`, `getStatus`).
- Test component Ink (nếu viết) dùng `ink-testing-library`; lưu ý `tsconfig.json` hiện chỉ exclude `*.test.ts` — nếu thêm `*.test.tsx`, hãy thêm pattern này vào `exclude` để build không chặn.
- Known pre-existing failures (không do task mới): `keybindings.test.ts` (3), `file-mutation-queue.branches.test.ts` (1), `cli-args.branches.test.ts` (1) — sửa được thì ghi vào TODO.

---

## 7. Các bẫy thường gặp (đọc trước khi sửa)

1. **Sửa `agent-session.ts`**: file 2.275 dòng, nhiều nhánh event; sau khi sửa hãy chạy cả nhóm test `session/` + `agent/` + `modes/`.
2. **Model auth**: `setModel` ném lỗi nếu thiếu API key — test môi trường không có `secrets.json`/env key sẽ fail nếu quên mock `hasConfiguredAuth`.
3. **Compat detection**: sửa `compat-detection.ts` ảnh hưởng mọi provider — chạy `test/llm`.
4. **Extending settings**: thêm thuộc tính vào `Settings` interface **và** `settings-validator.ts` + test tương ứng.
5. **Trùng lặp event type** giữa `agent/types.ts` và `events/events.ts` — khi thêm event mới, cập nhật cả hai hoặc mở rộng type guard trong `events/event-guards.ts`.
6. **Đuôi `.js` khi import**: quên là build lỗi `Cannot find module` dù file tồn tại.
7. **Đừng paste code vào docs**: `ARCH.md`/`GOAL.md` mô tả bằng lời; ví dụ tối đa 3-5 dòng và đánh dấu là ví dụ minh họa (tốt nhất là không cần).
8. **Session file JSONL**: đừng viết test ghi/đọc file thật ngoài `tmpdir`; dùng `SessionManager.inMemory` khi có thể.

---

## 8. Definition of Done (với mỗi thay đổi)

- [ ] `npm run build` pass
- [ ] Không làm tăng số test fail ngoài danh sách known failures
- [ ] Có test cho hành vi mới (ưu tiên unit test thuần TS)
- [ ] `docs/TODO.md` phản ánh đúng trạng thái
- [ ] Nếu đổi kiến trúc/public API: cập nhật `docs/ARCH.md` mục liên quan

---

## 9. Ranh giới an toàn cho agent tự động

- Không tự ý `git push --force`, không xóa nhánh `main`, không sửa git history.
- Không thay đổi `package.json` `name`/`bin`/`license` nếu không có yêu cầu rõ ràng.
- Không xóa file `docs/ARCH.md`, `docs/GOAL.md`, `docs/TODO.md`, `AUTO-CONTINUE.md`.
- Thay đổi phá vỡ API công khai phải ghi rõ trong commit message và cập nhật caller trong cùng commit.

---

*Bộ ba tài liệu: `AGENTS.md` (file này) · `ARCH.md` (kiến trúc) · `GOAL.md` (mục tiêu/lộ trình).*
