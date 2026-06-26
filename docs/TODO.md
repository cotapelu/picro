# TODO: Fix OOM and Improve Stability

**Last Updated:** 2026-06-26  
**Status:** In Progress – OOM fix applied, testing needed

---

## Problem

When scanning large codebases, the agent crashes with:
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**Root Cause**: Bash tool (used for `ls`, `grep`, `find`, `read`) returns full output without truncation. Large outputs (many files, long files) accumulate in memory as `ToolTurn` objects, causing heap overflow before compaction can trigger.

---

## Solution Implemented

### 1. Truncate Bash Output
- Added `src/utils/truncate.ts` from reference implementation (`llm-context/agent/src/harness/utils/truncate.ts`)
- Updated `src/tools/bash-tool.ts` to use `truncateHead()` before storing output
- Default limits: **50KB** or **2000 lines** (whichever comes first)
- Original output length preserved in `details.fullOutputLength` for reference

**Commit**: `d435472 fix: truncate bash output to prevent OOM during large scans`

**Risk**: Low – Non-breaking change; output is truncated but still contains enough context (head of file/ls output). Agent can still work with truncated data.

---

## Remaining Tasks

### 2. Test Large Scan Scenario
- [ ] Run scan on a codebase with 500+ files
- [ ] Monitor memory usage (should stay under 500MB)
- [ ] Verify no OOM crashes
- [ ] Confirm agent can still read file contents effectively (even if truncated)

### 3. Consider Truncation for Other Tools
- [ ] `grep` output may also be large – ensure truncate applied
- [ ] `find` output – same
- [ ] If any tool reads raw file content via `fs.readFile` (not bash), apply similar truncation

### 4. Improve Compaction Trigger (Optional)
- Current compaction runs only after `agent:end` (when assistant message completes)
- Could add pre-request token check to trigger compaction earlier if context nearing limit
- Reference: `pi-agent-core` does not have this either; relies on LLM overflow error

### 5. InteractiveMode Compatibility
- [ ] Fix event type mismatches (kebab-case vs snake_case)
- [ ] Ensure `turn:start` / `turn:end` emitted correctly
- [ ] Test TUI interactive mode end-to-end

### 6. Explore Migration to pi-agent-core (Long-term)
- Current custom `AgentLoop` works but has maintenance burden
- Migration would align with reference and inherit fixes
- High risk – requires extensive testing
- **Defer until after OOM issue fully resolved and validated**

---

## Testing Strategy

1. Unit tests for truncate function (already from reference, but add edge cases)
2. Integration test: simulate large `ls` output, verify truncation
3. Manual test: `scan` command on a large project
4. Memory profiling: compare before/after

---

## Success Criteria

- [ ] Scan 1000+ files without OOM
- [ ] Memory usage stays bounded (< 500MB typical, < 1GB extreme)
- [ ] Agent can still answer questions about code (truncated data is sufficient)
- [ ] No regression in normal operations
- [ ] Build passes, tests pass (coverage ≥80%)

---

## Notes

- Reference implementation uses same truncate defaults (50KB/2000 lines)
- This fix directly addresses the OOM reported by user
- No changes to AgentLoop or compaction logic required – simple truncation at source is sufficient
- If later we find that truncation loses critical info, we can tune `maxBytes`/`maxLines` via config

---

**Next Step**: Manual testing of scan with large codebase, verify memory stability.
