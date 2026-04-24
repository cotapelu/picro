# Coding Agent Development Guide

**Last Updated:** 2026-04-22  
**Phase:** Active Development (Pre-v1.0)  
**Mantra:** *Build fast, break things, learn quickly*

---

## ⚠️ **READ THIS FIRST**

We're in **ACTIVE DEVELOPMENT**, not production maintenance.

This means:
- ✅ **Everything is mutable** - No sacred APIs, no "don't touch" files
- ✅ **Break things deliberately** - Experimentation encouraged
- ✅ **Move fast** - Minimal bureaucracy
- ✅ **No backward compatibility promises** until v1.0

**The only real rules are:**
1. Don't break the build (without fixing it immediately)
2. Don't introduce security vulnerabilities
3. Don't be a jerk (be respectful in code reviews)

Everything else is **guidance**, not **law**.

---

## 📦 **Package Structure (Overview)**

```
pi-micro/
├── packages/
│   ├── memory/           ← Memory storage & retrieval algorithms
│   ├── agent/            ← Agent orchestration, strategies, tools
│   ├── llm/              ← LLM provider abstraction (25+ providers)
│   ├── tui/              ← Terminal UI components
│   └── coding-agent/    ← The actual app (CLI + TUI)
├── docs/
│   ├── TODO.md           ← Feature roadmap
│   └── (more coming...)
└── AGENTS.md             ← This file
```

**Dependency flow:**
```
coding-agent
├── uses agent, memory, llm, tui
├── agent uses llm, memory
└── others are standalone
```

---

## 🎯 **Development Workflow**

### **The Loop (6 Phases)**

```bash
1. 🗺️   Planning    - What problem? What solution?
2. 💻  Code        - Implement (any package, any file)
3. 🧪  Test        - Add tests, verify works
4. 📊  Evaluate    - Manual test, check metrics
5. ✅  Decision    - Keep? Discard? Refactor?
6. 🚀  PR & Merge  - Share with team, merge when ready
```

**Repeat until v1.0!**

---

## 📝 **Detailed Guidelines**

### **Phase 1: Planning 🗺️**

Before coding:
1. **Read the code** you'll modify (understand existing patterns)
2. **Check `docs/TODO.md`** for prioritized tasks
3. **Sketch your design** (comment, diagram, or notes)
4. **Consider impacts:**
   - Which packages will be affected?
   - Will this break existing functionality?
   - Do we need new tests?

**Output:** Clear mental model + maybe a `.plan.md` note

---

### **Phase 2: Implementation 💻**

**Branch strategy:**
```bash
git checkout -b feature/short-description
# or
git checkout -b fix/what-im-fixing
```

**Code style:**
- Follow existing patterns in the file you're editing
- Prefer readability over cleverness
- Add JSDoc for public functions
- Keep functions small (≤ 50 lines)

**What to modify:**
- **Any file in any package** - There are no restrictions
- You can change public APIs
- You can delete old code
- You can add new packages even

**But remember:**
- Other packages may depend on your changes
- If you break something, fix it
- If you change behavior, update docs/examples

---

### **Phase 3: Testing 🧪**

**Philosophy:** Tests prove your code works and prevent regressions.

**Minimum requirements:**
- **New code:** Write at least 1 test per function/class
- **Bug fixes:** Write test that would have caught the bug
- **Refactoring:** Keep existing tests green

**Coverage target:** 80%+ (use `npm run test:coverage`)

**Types of tests:**
- **Unit:** Test individual functions in isolation
- **Integration:** Test multiple components together
- **E2E:** Test full workflow (TUI simulation)

**Where to put tests:**
```
packages/<package>/tests/
├── unit/
│   ├── my-feature.test.ts
│   └── ...
├── integration/
│   └── ...
└── e2e/
    └── ...
```

**Running tests:**
```bash
# All tests
npm test

# Specific package
npm test -- --package memory

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

---

### **Phase 4: Evaluation 📊**

**Self-evaluate before PR:**

1. **Build check:**
```bash
npm run build --workspaces
# All packages must build cleanly
```

2. **Test check:**
```bash
npm test
# All tests pass
```

3. **Manual test:**
```bash
# For coding-agent:
cd packages/coding-agent
npm run dev interactive
# Try your feature manually
```

4. **Performance check (if applicable):**
```bash
# Check memory usage
# Check response times
# Compare to baseline (if available)
```

5. **Security review:**
   - Did you validate inputs?
   - Did you check for path traversal?
   - Did you avoid command injection?
   - Did you handle secrets properly?

---

### **Phase 5: Decision ✅**

**When to keep:**
- ✅ Tests pass
- ✅ Build clean
- ✅ Manual test OK
- ✅ No security issues
- ✅ Performance acceptable (no huge regressions)

**When to discard:**
- ❌ Too complex for the benefit
- ❌ Breaks existing functionality (without good reason)
- ❌ Too slow/regression in performance
- ❌ You're not satisfied with the approach

**Remember:** It's OK to throw away code. Better to discard early than carry technical debt.

---


### **Phase 6: Merge & Cleanup 🚀**

**Khi feature hoàn thành (trên branch `feature/xxx`):**

1. **Double-check:**
   - [ ] Build sạch: `npm run build --workspaces`
   - [ ] Tests-pass: `npm test`
   - [ ] Manual test OK (nếu là UI)
   - [ ] Không còn console.log debug

2. **Commit tất cả thay đổi:**
```bash
git add -A
git commit -m "feat: short description"
# hoặc
git commit -m "fix: what was broken"
```

3. **Merge vào local `main`:**
```bash
git checkout main
git merge --no-ff feature/xxx -m "merge: feature/xxx"
```
**Tại sao `--no-ff`?** Giữ lại history rõ ràng, dễ revert nếu cần.

4. **Xóa branch dev (local):**
```bash
git branch -d feature/xxx
```

5. **(Optional) Push lên remote:**
```bash
git push origin main


---


### **`memory/`**
- **What it does:** Storage, retrieval, deduplication, forgetting
- **Can modify:** Everything (algorithms, data structures, formats)
- **Consider:** Performance of search, accuracy of scoring, memory footprint
- **Testing:** Benchmark retrieval speed, test edge cases

### **`agent/`**
- **What it does:** Orchestrates LLM, tools, context, strategies
- **Can modify:** Strategies, tool execution, context management
- **Consider:** Error recovery, timeout handling, state management
- **Testing:** Mock LLM for deterministic agent tests

### **`llm/`**
- **What it does:** Abstraction over 25+ LLM providers
- **Can modify:** Only bug fixes or new providers
- **Why stable?** Many packages depend on it
- **Caution:** Breaking changes affect everyone

### **`tui/`**
- **What it does:** Terminal UI rendering components
- **Can modify:** Components, renderers, themes
- **Consider:** Performance (rendering speed), accessibility
- **Testing:** Snapshot tests for UI output

### **`coding-agent/`**
- **What it does:** The actual application (CLI, TUI, tools)
- **Can modify:** Everything (this is the app layer)
- **Where new features go:** Tools, TUI panels, config options
- **Testing:** E2E tests are valuable here

---

## 🚦 **When Rules Change (Stabilization)**

**Current phase:** Pre-v1.0, everything is unstable

**When we hit v1.0, we'll introduce:**
- **STABLE/UNSTABLE markings** for public APIs
- **Deprecation warnings** before breaking changes
- **SemVer** (major.minor.patch)
- **Long-term support** for STABLE APIs

**Signal:** Stable APIs will be marked in docs and code comments.

Until then: **Move fast, break things, document consequences.**

---

## ❓ **Common Scenarios**

### **"Can I change this public method in memory/engine.ts?"**

**Answer:** Yes, absolutely. It's active dev. Just:
1. Update callers in other packages
2. Add tests for new behavior
3. Note breaking change in PR

### **"Do I need permission to add a new package?"**

**Answer:** No. If you need a new package, create it. Just:
1. Add it to `package.json` workspaces
2. Document its purpose
3. Consider dependencies (who uses it?)

### **"What if my change breaks other packages?"**

**Answer:** Fix it. You own your changes. If you break something, either:
- Fix the breakage
- Revert and rethink
- Discuss with team for alternative

### **"Can I refactor large parts of the codebase?"**

**Answer:** Yes, but **one package at a time**. Don't change 5 packages in 1 PR. Keep PRs focused (< 300 lines ideal).

### **"Do I have to write tests?"**

**Answer:** For new code, **yes**. For legacy code (untested), add tests when you touch it (boy scout rule).

---

## 📖 **Further Reading**

- **`docs/TODO.md`** - Feature roadmap with priorities
- **Package READMEs** - Each package has its own
- **Code comments** - Read them, they often explain why
- **Git history** - `git log --oneline -p <file>` shows evolution

---

## 🎓 **Philosophy**

We're building a **professional coding assistant** that rivals Cursor, Claude Code, etc.

This requires:
- **Bold experimentation** - Try new algorithms, UI patterns, tool ideas
- **Rapid iteration** - Build → test → learn → repeat
- **Quality consciousness** - Tests, security, performance matter
- **Collaboration** - Code reviews, documentation, knowledge sharing

**Trust your judgment.** If you see something that can be better, fix it. If you're unsure, ask. If you're stuck, experiment.

**Most rules in this guide are suggestions, not commandments.** Use your brain. Question assumptions. Make the codebase better every day.

---

**Happy coding! 🚀**

*Last updated: 2026-04-22*  
*Maintainer: @quangtynu*
