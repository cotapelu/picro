# Release Checklist

Before cutting a new version, verify the following:

## Quality Gates

- [ ] All tests passing: `npm test` (workspaces)
- [ ] Build succeeds: `npm run build --workspaces`
- [ ] Coverage >= 80% for critical modules (config, tools, tui, memory)
- [ ] No `console.warn` in production code (should use logger)
- [ ] No `any` types in public APIs
- [ ] No dead code (unused imports, functions, files)

## Documentation

- [ ] README up-to-date with new features, keybindings
- [ ] CHANGELOG updated with all changes for this release
- [ ] Architecture diagram reflects current state (docs/architecture.md)
- [ ] Tool reference documentation synced with `src/tools/`
- [ ] API docs (JSDoc) for public exports complete

## Security & Performance

- [ ] API keys not logged or leaked in errors
- [ ] File path validation enforced (no path traversal)
- [ ] Memory retrieval latency p95 < 50ms (cache hit path)
- [ ] LLM retry with exponential backoff stable
- [ ] Tool timeouts respected and cancellable

## User Experience

- [ ] Error messages are user-friendly
- [ ] Keybindings documented and consistent
- [ ] Settings panel correctly reflects current config
- [ ] Command palette covers all important actions
- [ ] TUI responsive on common terminal sizes

## Compatibility

- [ ] Build works on Linux, macOS (verify)
- [ ] No reliance on platform-specific paths (use `os.homedir`)
- [ ] Node.js >= 18 (check engines field)

## Release Process

1. Update version in root `package.json` and all workspaces (use `changeset` or manual)
2. Run `npm run build --workspaces` (fresh build)
3. Create release commit: `git commit -m "chore: release vX.Y.Z"` (no code changes)
4. Tag: `git tag vX.Y.Z && git push && git push --tags`
5. Publish: `npm publish -ws` (publish changed workspaces)
6. Create GitHub release with CHANGELOG notes
7. Announce on relevant channels (Discord, Twitter, etc.)

---

_Last reviewed: 2026-04-23_
