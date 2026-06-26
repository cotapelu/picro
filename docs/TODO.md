# TODO: Development Tasks

**Last Updated:** 2026-06-26

---

## InteractiveMode Compatibility

... (existing items from remote) ...

---

## OOM Fix and Memory Management

- [x] Truncate bash output (50KB/2000 lines) – DONE (d435472)
- [ ] Test large scan (500+ files)
- [ ] Apply similar truncation to grep/find if needed
- [ ] Consider pre-request compaction trigger (optional)
- [ ] Monitor memory usage in production

---

## Long-term: Migrate to pi-agent-core

- [ ] Evaluate migration cost vs benefit
- [ ] If proceed, follow plan in separate document
- [ ] Ensure no regression in stability

