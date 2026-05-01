# Gap Analysis: Auth Guidance, Bash Executor, Output Guard

## 1. Auth Guidance

### Reference (llm-context/agent/core/auth-guidance.ts)
- `formatNoApiKeyFoundMessage(provider): string` - format instruction để add API key
- `formatNoModelSelectedMessage(): string` - format instruction để chọn model
- Used in AgentSession.prompt() để hướng dẫn user

### Current (src/)
- ❌ File `auth-guidance.ts` KHÔNG TỒN TẠI

### Gap
- ❌ Cần tạo auth-guidance.ts với 2 helper functions
- ❌ Integration vào AgentSession.prompt() - check API key và model trước khi run

---

## 2. Bash Executor

### Reference (llm-context/agent/core/bash-executor.ts)
- `executeBashWithOperations(command, cwd, env, timeout, onChunk, signal, operations): Promise<BashResult>`
  - `BashResult`: exitCode, output, error, truncated, timedOut, killed, operations (FileOperations)
- Track exit code, stderr separate
- Detached process tracking (background processes)
- Shell mode vs direct execution
- Output streaming với onChunk callback
- Proper signal handling và process cleanup

### Current (src/tools/bash-executor.ts)
- `executeBash(command, options): Promise<BashResult>`
  - Có output, exitCode, error, truncated
  - Có timeout handling
  - Có streaming onChunk
- ❌ Không track file operations (readFiles, modifiedFiles)
- ❌ Detached process tracking chưa có (child processes có thể runaway)
- ❌ Stderr separation chưa rõ (output là combined stdout+stderr?)
- ❌ Shell mode detection chưa có (shebang detection)
- ❌ Process cleanup với killProcessTree chưa tích hợp đầy đủ

### Gap
1. ❌ File operations tracking: gọi `extractFileOpsFromMessage()` từ reference utils
2. ❌ Detached process management: track PIDs, kill tree on abort
3. ❌ Stderr separate capture
4. ❌ Shell detection (#!/bin/bash ở đầu file)
5. ❌ Process group handling để kill tree
6. ❌ Better timeout handling với AbortSignal

---

## 3. Output Guard

### Reference (llm-context/agent/core/output-guard.ts)
- `validateOutput(text, options): OutputValidation`
  - Checks: size, line length, binary detection, ANSI stripping
  - `OutputValidation`: valid, sanitized, warnings, truncated, binaryDetected
- `sanitizeOutput(text, options): string` - strip ANSI, control chars, truncate
- Binary detection: chi tiết, dùng TextDecoder với {fatal: true}
- Control character stripping (C0/C1 except \n,\r,\t)
- ANSI escape sequence removal

### Current (src/output-guard.ts)
- `validateOutput(text, {maxSize, maxLineLength, stripAnsi}): OutputValidation`
  - Valid: binaryDetection (null bytes only)
  - `sanitizeOutput()`: stripAnsi, truncateTail, truncateHead
- ❌ Binary detection chỉ check null bytes - CHƯA ĐỦ
- ❌ Control characters chưa strip đầy đủ
- ❌ Line truncation chưa có
- ❌ High ASCII ratio detection chưa có

### Gap
1. ❌ Cải thiện binary detection:
   - Dùng TextDecoder với fatal: true để detect invalid UTF-8
   - Check high ASCII ratio (> 0.3 non-ASCII chars)
   - Null byte detection (đã có)
2. ❌ Control character stripping: regex cho C0 (0x00-0x1F) và C1 (0x80-0x9F), giữ \n,\r,\t
3. ❌ Line-based truncation: truncate lines nếu quá dài
4. ❌ Better ANSI stripping: tách regex cho ESC[? sequences
5. ❌ Validate: warnings array đầy đủ (size, lines, binary, truncation)
6. ❌ Options: keepNewlines, maxLines, lineWidth

---

## Implementation Priority
1. Auth guidance: Dễ, 1 file
2. Bash executor: Trung bình, cần integrate file ops tracking từ utils
3. Output guard: Trung bình, cần cải thiện detection algorithms
