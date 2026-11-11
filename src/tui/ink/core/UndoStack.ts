// UndoStack - ngăn hoàn tác theo snapshot
// Bắt chước nguyên tắc pi-tui undo-stack.ts:
//   - push nhận bản sao sâu của trạng thái
//   - pop trả về snapshot mới nhất và tách khỏi ngăn
//   - clear làm rỗng
// Port sang TSX riêng, khon copy code truc iep.

export class UndoStack<S> {
  private stack: S[] = [];

  push(state: S): void {
    this.stack.push(structuredClone(state));
  }

  pop(): S | undefined {
    return this.stack.pop();
  }

  clear(): void {
    this.stack.length = 0;
  }

  get length(): number {
    return this.stack.length;
  }
}
