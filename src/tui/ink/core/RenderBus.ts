// RenderBus - kênh báo hiệu render lại
// Bắt chước vai trò của TUI.requestRender trong pi-tui: cho phép tiện ích
// nền (timer, loader, flash) xin render lại mà không cần truyền reference TUI.
// Port sang TSX riêng, khong copy code truc iep.

type Listener = (...args: unknown[]) => void;

const listeners = new Set<{ token: symbol; fn: Listener }>();

export const requestRenderBus = {
  /** Đăng ký lắng nghe; trả về token để hủy. */
  subscribe(fn: Listener): symbol {
    const token = Symbol("render-bus");
    listeners.add({ token, fn });
    return token;
  },

  unsubscribe(token: symbol): void {
    for (const entry of listeners) {
      if (entry.token === token) {
        listeners.delete(entry);
        return;
      }
    }
  },

  /** Phát tín hiệu render cho mọi người nghe. */
  publish(): void {
    for (const entry of [...listeners]) {
      try {
        entry.fn();
      } catch {
        // Bỏ qua lỗi từ listener riêng lẻ.
      }
    }
  },
};
