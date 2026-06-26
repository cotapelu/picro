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
