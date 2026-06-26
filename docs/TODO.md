# TODO: Development Tasks

**Last Updated:** 2026-06-26

---

## InteractiveMode Compatibility

... (existing items from remote) ...

---

## OOM Fix and Memory Management

- [x] Truncate bash output (50KB/2000 lines) – DONE (d435472, ab8d79d)
- [x] Add memory safeguards (MAX_TOOL_TURNS=1000, MAX_TOOL_RESULTS=1000) – DONE (ab8d79d)
- [x] Fix test suite (memory injection default, skills, transformContext) – DONE (08ee401)
- [x] Reduce read-tool default limits to 100KB/2000 lines – DONE (f5e4ff8)
- [ ] Test large scan (500+ files) – manual verification
- [ ] Apply similar truncation to grep/find if needed (likely unnecessary due to existing limits)
- [ ] Consider pre-request compaction trigger (optional)
- [ ] Monitor memory usage in production

---

## Long-term: Migrate to pi-agent-core

- [ ] Evaluate migration cost vs benefit
- [ ] If proceed, follow plan in separate document
- [ ] Ensure no regression in stability
