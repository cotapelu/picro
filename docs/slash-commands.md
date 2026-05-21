# Slash Commands Reference

Picro supports a variety of slash commands for quick access to features. Type `/` in the input to open the command palette.

## Command List

| Command | Description |
|---------|-------------|
| `/settings` | Open settings menu |
| `/model` | Select model (opens selector UI) |
| `/scoped-models` | Enable/disable models for cycling |
| `/export` | Export session to HTML |
| `/import` | Import and resume a session from JSONL |
| `/share` | Share session as secret GitHub gist |
| `/copy` | Copy last agent message to clipboard |
| `/copy all` | Copy full conversation to clipboard |
| `/name` | Set session display name |
| `/session` | Show session info and stats |
| `/changelog` | Show changelog entries |
| `/hotkeys` | Show all keyboard shortcuts |
| `/fork` | Create a new fork from a previous user message |
| `/clone` | Duplicate current session at current position |
| `/tree` | Navigate session tree (switch branches) |
| `/login` | Configure provider authentication |
| `/logout` | Remove provider authentication |
| `/new` | Start a new session |
| `/compact` | Manually compact the session context |
| `/resume` | Resume a different session |
| `/reload` | Reload keybindings, extensions, skills, prompts, and themes |
| `/quit` | Quit the application |
| `/thinking [level]` | Set thinking level (off, minimal, low, medium, high, xhigh). Usage: `/thinking medium` |
| `/help` | Show help message with available commands |

## Examples

- `/thinking high` - Set thinking level to high
- `/copy all` - Copy entire conversation
- `/model` - Open model selector
- `/settings` - Open settings menu

## Notes

- Some commands may require additional setup (e.g., `/import` requires `fd` installed).
- Command arguments are optional for commands with flags or parameters.
