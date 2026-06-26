// Input component - manages input state and history
import type { InputState } from './types';

export function createInputState(initialValue = '', options: Partial<InputState> = {}): InputState {
  return {
    value: initialValue,
    placeholder: options.placeholder || 'Enter your message...',
    history: options.history || [],
    historyIndex: -1,
    disabled: options.disabled || false,
    multiline: options.multiline || false,
  };
}

export function updateInputValue(state: InputState, value: string): InputState {
  return { ...state, value };
}

export function moveInputHistoryUp(state: InputState): InputState {
  if (state.history.length === 0 || state.historyIndex >= state.history.length - 1) {
    return state;
  }
  const newIndex = state.historyIndex === -1 ? state.history.length - 1 : state.historyIndex + 1;
  return {
    ...state,
    value: state.history[newIndex] || '',
    historyIndex: newIndex,
  };
}

export function moveInputHistoryDown(state: InputState): InputState {
  if (state.historyIndex <= 0) {
    return {
      ...state,
      value: state.historyIndex === -1 ? state.value : '',
      historyIndex: -1,
    };
  }
  const newIndex = state.historyIndex - 1;
  return {
    ...state,
    value: state.history[newIndex] || '',
    historyIndex: newIndex,
  };
}

export function addToHistory(state: InputState, value: string, maxEntries = 100): InputState {
  const trimmed = value.trim();
  if (!trimmed) return state;

  const newHistory = [...state.history];
  // Remove duplicate at current position if exists
  const existingIdx = newHistory.indexOf(trimmed);
  if (existingIdx !== -1) {
    newHistory.splice(existingIdx, 1);
  }
  // Add to end
  newHistory.push(trimmed);
  // Trim if exceeds max
  if (newHistory.length > maxEntries) {
    newHistory.shift();
  }

  return {
    ...state,
    history: newHistory,
    historyIndex: -1,
    value: '',
  };
}

export function renderInput(state: InputState, prompt = '> ', width = 80): string {
  if (state.disabled) {
    return `${prompt}[disabled]`;
  }

  const displayValue = state.value || (state.placeholder ? `{${state.placeholder}}` : '');
  const fullLine = prompt + displayValue;

  // Simple wrap if too long (for now, just truncate)
  if (fullLine.length > width) {
    return fullLine.slice(0, width - 3) + '...';
  }

  return fullLine;
}

export function isInputEmpty(state: InputState): boolean {
  return state.value.trim().length === 0;
}
