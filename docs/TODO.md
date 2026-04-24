# pi-micro Development Roadmap

## ✅ Completed (Tier 1)

### Core Features (2026-04-23)
- [x] **Debug Mode Panel** (F5 toggle, file logging, metrics overlay)
- [x] **Tool Progress & Cancellation** (progress bar, Ctrl+C abort)
- [x] **Enhanced Session Search** (BM25 ranking, score display)
- [x] **Configuration Validation** (schema check, auto-fix)
- [x] **Session Management** (rename, tags via Ctrl+P -> Manage Session)
- [x] **Memory Highlighting** (`[📚 N memories]` indicator)
- [x] **LLM Error Recovery** (exponential backoff, 3 retries)
- [x] **InputBox Component** (for search and session management)

### Infrastructure (2026-04-22)
- [x] Memory UI Integration (Ctrl+M panel, `memory:retrieve` event)
- [x] Syntax Highlighting (highlight.js, code block borders, copy command)
- [x] Memory Store Adapter (bridge between AgentMemoryApp and BaseAgent)
- [x] Config `debugMode` setting and CLI `--debug` flag

---

## 🎯 Current Priorities (Tier 2)

### Performance & Security
- [ ] **Memory retrieval latency <50ms p95** - Profile and optimize engine queries
- [ ] **Context token optimization** - Better truncation, reduce bloat
- [ ] **Memory cache with TTL** - Cache retrieval results for repeated queries
- [ ] **Input sanitization** - Validate tool arguments, prevent injection
- [ ] **Path traversal protection** - Restrict file tools to project directory

### UX Polish
- [ ] **Tool execution timeout UI feedback** - Show countdown/progress for long-running tools
- [ ] **Copy code button in code blocks** - Inline copy per code block
- [ ] **Better error messages** - User-friendly, actionable errors
- [ ] **Loading spinners** - For memory init, LLM connection, etc.
- [ ] **Command palette filter** - Type-ahead filtering of commands
- [ ] **Color theme support** - Switchable color schemes

---

## 📋 Backlog

### Testing & Quality
- [ ] Unit tests for DebugCollector, InputBox, BM25
- [ ] Integration test for search panel and session management
- [ ] E2E test for debug mode toggle
- [ ] Coverage report >=80%

### Documentation & Deployment
- [ ] Update README with all new features
- [ ] Architecture diagram (packages and data flow)
- [ ] Auto-generate tool reference docs
- [ ] Maintain CHANGELOG.md
- [ ] Release checklist and criteria

### Advanced Features
- [ ] BM25 filters (date, provider, tags) for search
- [ ] Memory deduplication enhancement
- [ ] Memory citation highlighting in assistant messages (which parts used which memories)
- [x] Session rename UI improvements (bulk rename)
- [ ] Provider-specific streaming optimizations

---

## 📝 Notes

- **Pre-v1.0**: Breaking changes allowed but must be documented.
- **LLM package is stable** - do not break public API.
- **Memory package is actively optimized** - follow PROTOCOL.md.
- **Tests**: All packages must pass `npm test` before merge.

---

**Last updated:** 2026-04-23
