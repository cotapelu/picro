// MessageList component - renders conversation messages
import type { Message } from './types.js';

export function renderMessage(message: Message, width = 80, showTimestamp = true): string {
  const roleLabel = getRoleLabel(message.role);
  const timestamp = showTimestamp ? `[${formatTime(message.timestamp)}]` : '';
  const header = `${roleLabel}${timestamp ? ' ' + timestamp : ''}`;
  const separator = '─'.repeat(width);

  // Wrap content
  const contentLines = wrapText(message.content, width - 4, 2);

  const lines = [
    separator,
    header,
    '-'.repeat(width),
    ...contentLines.map(line => '  ' + line),
    separator,
  ];

  return lines.join('\n');
}

export function renderMessageList(
  messages: Message[],
  options: { width?: number; showTimestamp?: boolean; maxMessages?: number } = {}
): string {
  const { width = 80, showTimestamp = true, maxMessages } = options;

  const msgsToRender = maxMessages ? messages.slice(-maxMessages) : messages;

  return msgsToRender
    .map(msg => renderMessage(msg, width, showTimestamp))
    .join('\n\n');
}

function getRoleLabel(role: Message['role']): string {
  switch (role) {
    case 'user': return '👤 You';
    case 'assistant': return '🤖 Assistant';
    case 'system': return '⚙️ System';
    case 'tool': return '🔧 Tool';
    default: return '❓ Unknown';
  }
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function wrapText(text: string, maxWidth: number, indent: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split(/\n\n+/);

  for (const para of paragraphs) {
    const words = para.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length > maxWidth) {
        if (currentLine) {
          lines.push(currentLine.trim());
          currentLine = word;
        } else {
          lines.push(word); // Single long word
        }
      } else {
        currentLine = currentLine ? currentLine + ' ' + word : word;
      }
    }
    if (currentLine) {
      lines.push(currentLine.trim());
    }
    // Add extra line between paragraphs
    if (lines.length > 0 && para !== paragraphs[paragraphs.length - 1]) {
      lines.push('');
    }
  }

  return lines.map(line => ' '.repeat(indent) + line).filter(l => l.trim().length > 0 || l === '');
}

export function getLastAssistantMessage(messages: Message[]): Message | null {
  return [...messages].reverse().find(m => m.role === 'assistant') || null;
}

export function getLastUserMessage(messages: Message[]): Message | null {
  return [...messages].reverse().find(m => m.role === 'user') || null;
}
