# Agent Memory Experiment Protocol

## Architecture

```
packages/memory/
├── retrieval.ts   ← CORE (agent modify)
├── engine.ts      ← CORE (agent modify)
├── index.ts       ← EXPORT ONLY (re-export *)
├── agent-app.ts   ← CORE (agent modify)
├── storage.ts     ← CORE (agent modify)
├── types.ts       ← Support (do not modify)
└── events.ts      ← Infrastructure (do not modify)

packages/llm/       ← TOOL - LLM providers (fixed)
packages/coding-agent/      ← APP - evaluation (fixed)
```

## Protocol

### For Agent

1. **Modify** memory code in `packages/memory/`
2. **Run** evaluation: `npx ts-node packages/coding-agent/app.ts`
3. **Check** score - if >= 50: keep, if < 50: discard
4. **Repeat**

### Commands

```bash
# Run evaluation (uses real LLM)
npx ts-node packages/coding-agent/app.ts

# Or build first
npx tsc && node dist/packages/coding-agent/app.js
```


### What Agent Can Modify

**ALL files in `packages/memory/`** (agent has full freedom to optimize):
- `retrieval.ts` - Search algorithm, scoring
- `engine.ts` - Memory logic, orchestration
- `agent-app.ts` - High-level API (AgentMemoryApp)
- `index.ts` - Export aggregator (no config/logic)
- `storage.ts` - Persistence, deduplication, eviction
- `types.ts` - Types, interfaces, data structures
- `events.ts` - Event logging, auditing

*Agent can modify any file in memory/ as needed.*

### What Agent CANNOT Modify

- `packages/coding-agent/app.ts` - Fixed evaluation
- `packages/llm/` - LLM providers (fixed)

## ⚠️ VERIFICATION & DEBUGGING

**Nếu nghi ngờ hệ thống evaluation bị lỗi, agent PHẢI kiểm tra và sửa code trong `coding-agent/` và `llm/` trước khi tiếp tục experiment.**

### Các vấn đề thường gặp:
1. **LLM không gọi tools** → Kiểm tra tools format (OpenAI `type: 'function'`) trong `nvnim.ts`
2. **Tool results bị mất** → Kiểm tra `app.ts` loop (phải append results vào prompt cho LLM tiếp tục)
3. **Score m安庆 (cứng như nhau)** → Kiểm tra evaluation prompt, biến substitution.
4. **Build errors** → Kiểm tra tsconfig, dependencies.

### Files cần kiểm tra khi có vấn đề:
- `packages/coding-agent/app.ts` - Main evaluation loop
- `packages/llm/nvnim.ts` - LLM provider, tool handling
- `packages/coding-agent/core/tools/` - Tool definitions
- `packages/coding-agent/core/prompt-loader.ts` - Prompts

**Important:** Luôn verify baseline hoạt động đúng trước khi bắt đầu memory experiment iterations.

### Metrics

| Metric | Weight |
|--------|--------|
| LLM answer correctness | 100% |

Score >= 50/100 to keep changes.

### Example Loop

```bash
# Agent modifies memory code
git commit -m "Improve retrieval"

# Evaluate with real LLM
npx tsc && node dist/packages/coding-agent/app.js

# If score >= 50: keep
# If score < 50: git reset --hard HEAD
