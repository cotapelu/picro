# Tool Reference

Coding Agent provides a set of built-in tools for file operations, code analysis, system commands, and more.

## Available Tools

### File Tools (`file`)

#### `read_file`
Read a file's contents.

**Parameters:**
- `filePath` (string, required): Path to the file

**Example:**
```json
{
  "name": "read_file",
  "arguments": { "filePath": "src/index.ts" }
}
```

#### `write_file`
Write content to a file (creates or overwrites).

**Parameters:**
- `filePath` (string, required): Destination path
- `content` (string, required): File content

#### `edit_file`
Edit a file by replacing text. Uses search/replace with optional context lines.

**Parameters:**
- `filePath` (string, required)
- `oldString` (string, required): Text to find
- `newString` (string, required): Replacement text

#### `list_files`
List files and directories.

**Parameters:**
- `directory` (string, optional, default `.`): Directory to list
- `recursive` (boolean, optional, default false)

#### `delete_file`
Delete a file or empty directory.

**Parameters:**
- `filePath` (string, required)

### Code Tools (`code`)

#### `search_code`
Search code with query (like grep).

**Parameters:**
- `query` (string, required): Search term
- `directory` (string, optional, default `.`)
- `filePattern` (string, optional, e.g., `*.ts`)

#### `analyze_file`
Analyze a file and return summary (token count, lines, complexity estimate).

**Parameters:**
- `filePath` (string, required)

### Command Tools (`command`)

#### `execute_command`
Run a shell command and capture output.

**Parameters:**
- `command` (string, required): Command to execute
- `timeout` (number, optional, ms): Time limit

**Note:** Commands run in project root. Be cautious with destructive operations.

### Search Tools (`search`)

#### `search_files`
Search file contents with regex.

**Parameters:**
- `pattern` (string, required): Regular expression
- `path` (string, optional, default `.`)
- `limit` (number, optional, default 100)

#### `grep`
Alias for `search_files`.

### Git Tools (`git`)

#### `git_status`
Show git working tree status.

**Parameters:** None

#### `git_diff`
Show diff for staged/unstaged changes.

**Parameters:**
- `staged` (boolean, optional, default false)

#### `git_log`
Show commit history.

**Parameters:**
- `maxCount` (number, optional, default 20)

#### `git_commit`
Commit changes with message.

**Parameters:**
- `message` (string, required): Commit message
- `all` (boolean, optional, default true): `git commit -a` style

#### `git_checkout`
Switch branch or restore files.

**Parameters:**
- `branch` (string, required): Branch name or file path
- `createNew` (boolean, optional, default false): Create branch

## Using Tools

Tools are automatically available to the LLM. The agent decides when to call them based on user request.

You can also restrict tools by configuration if needed (future feature).

## Writing Custom Tools

Tools are defined by:

```typescript
interface ToolDefinition {
  name: string;
  description: string; // for LLM
  parameters: any; // JSON Schema
  handler: (args: Record<string, any>, context?: ToolContext, onProgress?: (update: ToolProgress) => void) => Promise<string>;
}
```

Register with `BaseAgent.registerTool(toolDef)`.

See `packages/coding-agent/src/tools/` for examples.

---

**Last updated:** 2026-04-23
