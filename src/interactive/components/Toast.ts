// Toast component - renders toast notifications as text
import type { Toast as ToastType, ToastType as ToastTypeEnum } from './types';

const DEFAULT_DURATION = 3000;

export function createToast(
  message: string,
  type: ToastTypeEnum = 'info',
  duration = DEFAULT_DURATION
): ToastType {
  return {
    id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    message,
    type,
    duration,
    createdAt: Date.now(),
  };
}

export function isToastExpired(toast: ToastType, now = Date.now()): boolean {
  if (!toast.duration) return false;
  return now - toast.createdAt > toast.duration;
}

export function renderToast(toast: ToastType, index: number, maxWidth = 60): string {
  const prefix = getToastPrefix(toast.type);
  const timestamp = new Date(toast.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Truncate message if too long
  const maxMsgLen = maxWidth - prefix.length - timestamp.length - 3; // for spaces and brackets
  const message = toast.message.length > maxMsgLen
    ? toast.message.slice(0, maxMsgLen - 3) + '...'
    : toast.message;

  const line = `[${timestamp}] ${prefix} ${message}`;
  return index === 0 ? line : `\n${line}`; // newest toast first
}

function getToastPrefix(type: ToastTypeEnum): string {
  switch (type) {
    case 'success': return '✓';
    case 'error': return '✗';
    case 'warning': return '⚠';
    case 'info': default: return 'ℹ';
  }
}

export function filterActiveToasts(toasts: ToastType[], now = Date.now()): ToastType[] {
  return toasts.filter(t => !isToastExpired(t, now));
}
