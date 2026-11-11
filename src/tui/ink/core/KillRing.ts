// KillRing - vòng đệm văn bản đã xóa kiểu Emacs
// Bắt chước nguyên tắc pi-tui kill-ring.ts:
//   - push: thêm đoạn đã xóa, có thể gộp vào mục gần nhất
//   - peek: xem mục mới nhất không làm thay đổi vòng
//   - rotate: xoay vòng để yank-pop
// Port sang TSX riêng, khong copy code truc iep.

export class KillRing {
  private ring: string[] = [];

  /**
   * Thêm đoạn văn bản đã xóa.
   * @param prepend - khi gộp, ghép vào đầu (xóa lùi) hoặc cuối (xóa tiến)
   * @param accumulate - gộp với mục gần nhất thay vì tạo mục mới
   */
  push(text: string, opts: { prepend: boolean; accumulate?: boolean }): void {
    if (!text) return;
    if (opts.accumulate && this.ring.length > 0) {
      const last = this.ring.pop()!;
      this.ring.push(opts.prepend ? text + last : last + text);
    } else {
      this.ring.push(text);
    }
  }

  peek(): string | undefined {
    return this.ring.length > 0 ? this.ring[this.ring.length - 1] : undefined;
  }

  rotate(): void {
    if (this.ring.length > 1) {
      const last = this.ring.pop()!;
      this.ring.unshift(last);
    }
  }

  get length(): number {
    return this.ring.length;
  }
}
