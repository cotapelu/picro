# Gap Analysis: Compaction System

## Reference (llm-context/agent/core/compaction/)
- `compaction.ts`: Full implementation với:
  - `extractFileOperations()` - track read/edited files
  - `getMessageFromEntry()` - convert entries to AgentMessage
  - `shouldCompact()` - decision logic dựa trên token count và thresholds
  - `prepareCompaction()` - tìm cut point, tính toán tokens
  - `compact()` - main function, gọi LLM để tạo summary
  - `findCutPoint()` - binary search để tìm vị trí cắt
  - `findTurnStartIndex()` - find start of turn
  - `calculateContextTokens()` - token calculation
  - `estimateTokens()` - estimation helper

- `branch-summarization.ts`:
  - `collectEntriesForBranchSummary()` - collect entries để summarize khi branch
  - `generateBranchSummary()` - gọi LLM tạo summary cho branch
  - Types: `BranchPreparation`, `CollectEntriesResult`, `BranchSummaryResult`

- `utils.ts`:
  - `FileOperations` type + functions: `createFileOps`, `computeFileLists`, `formatFileOperations`
  - `extractFileOpsFromMessage()` - extract từ tool calls
  - `SUMMARIZATION_SYSTEM_PROMPT`
  - `serializeConversation()`

## Current Implementation (src/)
- `compaction.ts`: CHỈ có hàm `compact()` đơn giản, thiếu hầu hết logic trên
- `agent-loop.ts`: Không có integration với compaction
- `agent-session.ts`: `compact()` method chỉ emit event, không thực hiện compaction thực sự

## GAPS
1. ❌ `shouldCompact()` function: kiểm tra token count vs thresholds
2. ❌ `prepareCompaction()`: tìm cut point, tính toán tokens
3. ❌ `findCutPoint()`: binary search logic
4. ❌ `extractFileOperations()`: track file operations từ messages
5. ❌ `getMessageFromEntry()`: convert session entries sang AgentMessage
6. ❌ `serializeConversation()`: format messages cho LLM
7. ❌ `compact()` main logic: gọi LLM, tạo summary entry
8. ❌ Branch summarization: `collectEntriesForBranchSummary()`, `generateBranchSummary()`
9. ❌ Compaction integration vào AgentLoop: check shouldCompact trước mỗi round
10. ❌ Auto-compaction trigger trong AgentSession
11. ❌ File ops tracking trong SessionManager entries
12. ❌ CompactionEntry details với readFiles/modifiedFiles

## Implementation Plan
- Phase 1: Implement compaction utils (utils.ts)
- Phase 2: Implement shouldCompact, prepareCompaction, findCutPoint
- Phase 3: Implement extractFileOperations, getMessageFromEntry, serializeConversation
- Phase 4: Implement compact() main function với LLM call
- Phase 5: Integrate vào AgentLoop context building
- Phase 6: Add auto-compaction trigger trong AgentSession
- Phase 7: Implement branch summarization
- Phase 8: Add compaction events (compaction_start, compaction_end)
- Phase 9: Update SessionManager để lưu compaction details
