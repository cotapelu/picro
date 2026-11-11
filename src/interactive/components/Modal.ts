// Modal component - renders different modal types as text
import type { ModalState } from './types.js';

export interface ModalRenderer {
  type: string;
  render: (props: any) => string;
  confirmLabel?: string;
  cancelLabel?: string;
}

// Pre-built modal renderers
const modalRenderers: Record<string, ModalRenderer> = {
  help: {
    type: 'help',
    render: (_props: any) => `
╔════════════════════════════════════════════════╗
║                   HELP                        ║
╠════════════════════════════════════════════════╣
║ /thinking [off|minimal|low|medium|high|xhigh] ║
║   - Set thinking level                        ║
║ /login - Login to provider                    ║
║ /copy [all] - Copy conversation               ║
║ /resume - Resume previous session             ║
║ /new - Create new session                     ║
║ /quit - Exit                                 ║
╚════════════════════════════════════════════════╝
`,
    confirmLabel: 'OK',
  },
  thinking: {
    type: 'thinking',
    render: (props: any) => `
╔════════════════════════════════════════════════╗
║               THINKING LEVEL                  ║
╠════════════════════════════════════════════════╣
║ Current: ${props.current || 'medium'}         ║
║                                                ║
║ Options: ${props.options?.join(', ') || 'off, minimal, low, medium, high, xhigh'} ║
╚════════════════════════════════════════════════╝
`,
    confirmLabel: 'Set',
    cancelLabel: 'Cancel',
  },
  confirmation: {
    type: 'confirmation',
    render: (props: any) => `
╔════════════════════════════════════════════════╗
║ ${(props.title || 'Confirm').padEnd(40)} ║
╠════════════════════════════════════════════════╣
║ ${props.message.split('\n').map((line: string) => line.padEnd(40)).join('\n')} ║
╚════════════════════════════════════════════════╝
`,
    confirmLabel: 'Yes',
    cancelLabel: 'No',
  },
  login: {
    type: 'login',
    render: () => `
╔════════════════════════════════════════════════╗
║                   LOGIN                       ║
╠════════════════════════════════════════════════╣
║ Enter your API key when prompted              ║
║ (will be saved to ~/.pi/agent/auth.json)      ║
╚════════════════════════════════════════════════╝
`,
    confirmLabel: 'Proceed',
    cancelLabel: 'Cancel',
  },
  'session-selector': {
    type: 'session-selector',
    render: (props: any) => `
╔════════════════════════════════════════════════╗
║               SESSION SELECTOR                ║
╠════════════════════════════════════════════════╣
${props.sessions?.length
  ? props.sessions.map((s: any, i: number) =>
      `║  ${i + 1}. ${s.id?.substring(0, 30).padEnd(30)} ║`
    ).join('\n')
  : '║  No saved sessions                           ║'}
╚════════════════════════════════════════════════╝
`,
    confirmLabel: 'Select',
    cancelLabel: 'Back',
  },
  'model-selector': {
    type: 'model-selector',
    render: (props: any) => `
╔════════════════════════════════════════════════╗
║               MODEL SELECTOR                  ║
╠════════════════════════════════════════════════╣
║ Current: ${(props.current || 'none').padEnd(40)} ║
║                                                ║
║ Available:                                     ║
${props.models?.map((m: any, i: number) =>
  `║  ${i + 1}. ${m.id?.padEnd(35)} [${m.provider}] ║`
).join('\n') || '║  None available                              ║'}
╚════════════════════════════════════════════════╝
`,
    confirmLabel: 'Select',
    cancelLabel: 'Cancel',
  },
  settings: {
    type: 'settings',
    render: (props: any) => {
      const s = props.settings || {};
      const theme = s.theme || 'default';
      const disabledTools = (s.disabledTools || []).join(', ') || 'none';
      const lines = [
        '+------------------------------------------+',
        '|                 SETTINGS                 |',
        '+------------------------------------------+',
        '| Theme: ' + theme + ' '.repeat(39 - theme.length) + '|',
        '| Disabled tools: ' + disabledTools + ' '.repeat(39 - disabledTools.length - 14) + '|',
        '| Default provider: ' + (s.defaultProvider || 'none') + ' '.repeat(39 - (s.defaultProvider || 'none').length - 16) + '|',
        '| Default model: ' + (s.defaultModel || 'none') + ' '.repeat(39 - (s.defaultModel || 'none').length - 14) + '|',
        '| Default thinking: ' + (s.defaultThinkingLevel || 'off') + ' '.repeat(39 - (s.defaultThinkingLevel || 'off').length - 17) + '|',
        '+------------------------------------------+',
        '| /theme <name> - Set theme                |',
        '| /tools <enable|disable> <tool> - Toggle  |',
        '+------------------------------------------+',
      ];
      return lines.join('\n');
    },
    confirmLabel: 'OK',
  },
  theme: {
    type: 'theme',
    render: (props: any) => {
      const current = props.current || 'default';
      const themes = ['dark', 'light', 'matrix'];
      const lines = [
        '+------------------------------------------+',
        '|              THEME SELECTOR              |',
        '+------------------------------------------+',
        '| Current: ' + current + ' '.repeat(39 - current.length - 9) + '|',
        '|                                          |',
      ];
      for (const t of themes) {
        const marker = t === current ? ' (current)' : '';
        lines.push('|  ' + t + marker + ' '.repeat(35 - t.length - marker.length) + '|');
      }
      lines.push('+------------------------------------------+');
      return lines.join('\n');
    },
    confirmLabel: 'Select',
    cancelLabel: 'Cancel',
  },
  tools: {
    type: 'tools',
    render: (props: any) => {
      const active = props.active || [];
      const disabled = props.disabled || [];
      const allTools = [...active, ...disabled];
      const lines = [
        '+------------------------------------------+',
        '|                    TOOLS                 |',
        '+------------------------------------------+',
      ];
      if (allTools.length === 0) {
        lines.push('|  No tools available                      |');
      } else {
        for (const tool of allTools) {
          const status = disabled.includes(tool) ? 'disabled' : 'active';
          lines.push('|  ' + tool + ' '.repeat(25 - tool.length) + ' [' + status + ' '.repeat(10 - status.length) + ']|');
        }
      }
      lines.push('+------------------------------------------+');
      lines.push('| /tools enable <tool> - Enable tool       |');
      lines.push('| /tools disable <tool> - Disable tool     |');
      lines.push('+------------------------------------------+');
      return lines.join('\n');
    },
    confirmLabel: 'OK',
  },
  sessions: {
    type: 'sessions',
    render: (props: any) => {
      const sessions = props.sessions || [];
      const currentId = props.currentId || '';
      const lines = [
        '+------------------------------------------+',
        '|                  SESSIONS                |',
        '+------------------------------------------+',
      ];
      if (sessions.length === 0) {
        lines.push('|  No saved sessions                       |');
      } else {
        for (let i = 0; i < sessions.length; i++) {
          const s = sessions[i];
          const id = (s && s.id ? s.id.substring(0, 28) : 'unknown');
          const marker = s.id === currentId ? ' (current)' : '';
          lines.push('|  ' + (i + 1) + '. ' + id + ' '.repeat(30 - id.length) + marker + '|');
        }
      }
      lines.push('+------------------------------------------+');
      lines.push('| Usage: /sessions <session-id> to switch  |');
      lines.push('+------------------------------------------+');
      return lines.join('\n');
    },
    confirmLabel: 'OK',
  },
};

/**
 * Get renderer for modal type
 */
export function getModalRenderer(type: string): ModalRenderer | null {
  return modalRenderers[type] || null;
}

/**
 * Render modal to string
 */
export function renderModal(modal: ModalState): string {
  if (modal.type === 'none') return '';

  const renderer = getModalRenderer(modal.type);
  if (renderer) {
    return renderer.render(modal.props || {});
  }

  // Fallback for custom modals
  return `
╔════════════════════════════════════════════════╗
║              ${(modal.type || 'Modal').padEnd(40)} ║
╠════════════════════════════════════════════════╣
║ ${'Custom modal'.padEnd(40)} ║
╚════════════════════════════════════════════════╝
`;
}
