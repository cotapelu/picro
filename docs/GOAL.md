# GOAL.md – Mục tiêu và lộ trình Picro

> File này trả lời ba câu hỏi: dự án đang đi đến đâu, đang ở đâu, và bước tiếp theo là gì.
> Cập nhật mỗi khi hoàn thành một mốc. Chi tiết kỹ thuật ở `docs/ARCH.md`; quy ước làm việc ở `docs/AGENTS.md`.

---

## 1. Vision (đích đến)

Trở thành một **AI coding agent CLI đáng tin cậy cho developer Việt Nam và thế giới**:

- Người dùng gõ tiếng Việt có dấu hoặc tiếng Anh trong terminal; agent đọc repo, sửa code, chạy lệnh, giải thích thay đổi.
- Mọi nhà cung cấp LLM lớn đều dùng được (hiện ~30 provider qua lớp OpenAI-compatible).
- Hội thoại lưu bền vững, branch được, resume được, audit được.
- Có thể nhúng vào workflow khác qua HTTP API/MCP, không chỉ là một CLI trơ.
- Chất lượng mã được kiểm chứng bằng test + review tự động, không chỉ "chạy được".

**Tuyên bố sản phẩm:** "Nói một câu, picro đọc repo, sửa code, chạy test, giải thích — trong terminal."

---

## 2. Trạng thái hiện tại (snapshot)

| Khía cạnh | Trạng thái |
|-----------|------------|
| Kiến trúc | ✅ Phân lớp rõ: runtime → controller → UI (Ink TUI + HTTP API) |
| Agent loop | ✅ Vòng lặp tool-use đầy đủ, streaming, retry, guard bộ nhớ (1000 turns) |
| LLM layer | ✅ OpenAI-compatible + compat matrix cho ~30 provider |
| Session | ✅ JSONL version 3, tree/branch, compaction (tóm tắt chưa chạy LLM thật) |
| Tools | ✅ read/write/edit/bash/ls/grep/find, path an toàn, truncate |
| TUI | ⚠️ Ink cơ bản: header/footer/message list/input/modal/selector; thiếu autocomplete, markdown nâng cao, footer realtime |
| HTTP API | ⚠️ REST + WebSocket tối thiản (health/prompt/messages/status) |
| Memory | ⚠️ Engine hoàn chỉnh (BM25 + heuristic) nhưng **chưa nối vào agent** |
| Extensions | ⚠️ API đầy đủ, ít ví dụ thực chiến |
| Test | ⚠️ 2.483 case; ~5 fail pre-existing do Node API; coverage chưa đo định kỳ |
| Docs | ✅ ARCH/AGENTS/GOAL/TODO/PROJECT_STATE đồng bộ |

---

## 3. Mục tiêu theo trụ cột (North Star Goals)

### 3.1 Trải nghiệm người dùng (UX)
- TUI mượt: virtual scrolling thực sự, autocomplete slash command, footer realtime (token, context %, git branch).
- Hội thoại đọc dễ: markdown (code block, table, list), diff preview trước khi edit, thinking block có thể thu gọn.
- Bàn phím đầy đủ: Ctrl+K (command palette), Ctrl+P (model cycling), j/k (scroll), Ctrl+L (clear).

### 3.2 Độ tin cậy (Reliability)
- Session sạch: không mất message khi crash (flush đúng điểm), resume chính xác nhánh.
- Tool an toàn: path guard, timeout, abort lan đến cả process tree.
- LLM: retry phân loại lỗi, compaction thật bằng LLM (thay stub), thống nhất event type.

### 3.3 Khả mở rộng (Extensibility)
- Extension API ổn định + ít nhất 2 extension mẫu (tool, command) có test.
- MCP client/server: kết nối tool ngoài theo chuẩn công nghiệp.
- Package manager extension thực dụng (install/remove từ git/npm).

### 3.4 Chất lượng kỹ thuật (Code Health)
- Coverage ≥ 80% toàn repo, ≥ 90% cho `agent/`, `session/`, `modes/`.
- Không file > 1.500 dòng (tách `AgentSession`).
- Loại bỏ trùng lặp: 2 bộ file tool, 2 nguồn event type, proxy-stream legacy.

### 3.5 Trải nghiệm phát triển (DevEx)
- Build < 10s, test < 60s.
- Onboarding < 30 phút: đọc ARCH + GOAL là đủ làm task đầu tiên.

---

## 4. Lộ trình (roadmap)

### Mốc 1 – TUI chuẩn "dùng được hằng ngày" *(đang thực hiện)*
- [x] Controller pattern + Ink TUI cơ bản + HTTP mode
- [x] Virtual scrolling + vim keys + search trong message list
- [x] Selectors: session/model/settings/theme (tương tác đầy đủ)
- [x] Markdown rendering cho assistant message
- [ ] Autocomplete slash command + path trong input
- [ ] Footer realtime (token, context %, nhánh git) nối `FooterDataProvider`
- [ ] Autot test UI (ít nhất smoke test cho App + Input)

**Định nghĩa xong:** người dùng mở terminal, gõ `/help`, `/model`, gõ prompt, thấy phản hồi stream + footer sống.

### Mốc 2 – Độ tin cậy
- [ ] Compaction gọi LLM thật (thay stub `performCompaction`)
- [ ] Gộp module trùng lặp (event type, bộ tool) — không đợi port lớn
- [ ] Coverage đo + gate CI (≥80%)
- [ ] Fix 5 test fail pre-existing (Node API)
- [ ] Test E2E: tạo session → prompt tool thật (mock LLM) → resume → fork

### Mốc 3 – Mở rộng tích hợp
- [ ] MCP client: đăng ký tool/server ngoài
- [ ] Memory integrated (theo cờ opt-in, có test A/B token)
- [ ] Extension mẫu + docs viết extension trong 15 phút
- [ ] HTTP API đủ production: auth token, streaming SSE, docker image

### Mốc 4 – Đóng gói & cộng đồng
- [ ] `npm publish` scoped package, `picro` global
- [ ] Mẫu config + skills + prompt templates cho repo điển hình
- [ ] CI: build matrix Linux/macOS/Windows, release tự động
- [ ] Trang docs công khai (VitePress)

---

## 5. Anti-goals (cố ý KHÔNG làm)

- Không viết lại LLM provider theo giao thức native từng hãng (giữ OpenAI-compatible + compat matrix).
- Không chạy web UI chính thức trong repo này (HTTP API đủ, FE là việc của client khác).
- Không thêm dependency nặng (LangChain, LlamaIndex…) cho một CLI: ưu tiên mã tự chủ.
- Không hỗ trợ browser/mobile TUI.

---

## 6. Rủi ro & cách giảm

| Rủi ro | Giảm thiểu |
|--------|------------|
| TUI Ink render chậm với hội thoại dài | Virtual scrolling + chunk render; benchmark message list 10k messages |
| Compaction làm mất ngữ cảnh quan trọng | Cut-point an toàn (không cắt tool call), test golden transcript |
| Compat provider đa dạng, mỗi hãng một kiểu | Compat matrix + test per provider dùng mock server |
| Memory phình context, tốn token | Mặc định tắt, opt-in + đo token delta có test |
| File session phình to với thời gian | Fact: append-only; mitig睇: compaction entry + lazy load nhánh |
| Thay đổi Node/TypeScript phá test cũ | Ghim engines >=20, test hàng ngày, dọn fail ngay khi xuất hiện |

---

## 7. Định nghĩa "xong" của từng mốc

Mỗi mốc được coi là xong khi: (1) toàn bộ task trong mốc đã tick; (2) `npm run build` pass; (3) không tăng known failures; (4) `docs/TODO.md` ghi rõ mốc tiếp theo; (5) commit gắn tag `milestone-N`.

---

## 8. Bước tiếp theo gần nhất (next 3 việc)

1. Port autocomplete vào `src/tui/ink/components/Input.tsx` (slash command + path).
2. Nối `FooterDataProvider` (git branch, extension status) vào `src/tui/ink/App.tsx`.
3. Viết smoke test cho App/Input để mở đường cho Mốc 1.

---

*Kết hợp với `docs/ARCH.md` (kiến trúc) và `docs/AGENTS.md` (quy ước). Cập nhật file này mỗi mốc hoàn thành.*
