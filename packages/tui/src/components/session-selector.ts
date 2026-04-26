import { SelectList, type SelectItem } from './select-list.js';

/**
 * Session information
 */
export interface SessionInfo {
  id: string;
  cwd: string;
  title?: string;
  updatedAt: Date;
  tokenCount?: number;
}

/**
 * Format relative time
 */
function timeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

/**
 * SessionSelector - list of sessions with search
 */
export class SessionSelector extends SelectList {
  private allSessions: SessionInfo[];

  constructor(
    sessions: SessionInfo[],
    visibleRows: number,
    onSelect?: (session: SessionInfo) => void
  ) {
    const items = SessionSelector.formatSessions(sessions);
    super(items, visibleRows, {}, (value) => {
      const session = sessions.find(s => s.id === value);
      if (session) onSelect?.(session);
    });
    this.allSessions = sessions;
  }

  setFilter(query: string): void {
    const q = query.toLowerCase();
    const filtered = this.allSessions.filter(s =>
      s.cwd.toLowerCase().includes(q) ||
      (s.title && s.title.toLowerCase().includes(q))
    );
    this.setItems(SessionSelector.formatSessions(filtered));
  }

  setSessions(sessions: SessionInfo[]): void {
    this.allSessions = sessions;
    this.setItems(SessionSelector.formatSessions(sessions));
  }

  private static formatSessions(sessions: SessionInfo[]): SelectItem[] {
    return sessions.map(s => {
      const title = s.title || 'Untitled';
      const time = timeAgo(s.updatedAt);
      const cwdDisplay = s.cwd.length > 30 ? '...' + s.cwd.slice(-27) : s.cwd;
      const label = `${cwdDisplay} - ${title} (${time})`;
      return {
        value: s.id,
        label,
      };
    });
  }
}
