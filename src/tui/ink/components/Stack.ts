// Stack - nền tảng xếp khối ngang/dọc cho HStack và VStack
// Bắt chước nguyên tắc pi-tui components/stack.ts:
//   - Mỗi con có basis (số dòng/cột cố định hoặc auto), grow, shrink,
//     minSize, maxSize, visible
//   - allocateStackSizes: dư chỗ thì chia theo grow, thiếu thì co theo shrink
//   - Container cơ sở: addChild/removeChild/clear/invalidate/render
// Port sang TSX riêng, khong copy code truc iep.

export const LAYOUT_NODE = Symbol.for("@picro/ink-tui/layout-node");

export interface LayoutViewport {
  width: number;
  height: number;
}

export interface StackLayoutEntry {
  component: unknown;
  basis?: number | "auto";
  grow?: number;
  shrink?: number;
  minSize?: number;
  maxSize?: number;
  visible?: (viewport: LayoutViewport) => boolean;
}

export interface StackLayoutNode {
  type: "vstack" | "hstack";
  entries: readonly StackLayoutEntry[];
  gap: number;
  align: "stretch" | "start" | "center" | "end";
}

export function getLayoutNode(component: unknown): StackLayoutNode | undefined {
  const candidate = component as Partial<{ [LAYOUT_NODE]: () => StackLayoutNode }>;
  return typeof candidate[LAYOUT_NODE] === "function" ? candidate[LAYOUT_NODE]() : undefined;
}

/** Chuẩn hóa giá trị kích thước về số nguyên không âm. */
function normalizeSize(value: number | undefined, fallback: number): number {
  return value === undefined || !Number.isFinite(value) ? fallback : Math.max(0, Math.floor(value));
}

const clampSize = (size: number, entry: StackLayoutEntry): number => {
  const min = Math.max(0, Math.floor(entry.minSize ?? 0));
  const max = Math.max(min, Math.floor(entry.maxSize ?? Number.MAX_SAFE_INTEGER));
  return Math.max(min, Math.min(max, Math.max(0, Math.floor(size))));
};

/** Phân phối hoặc thu hẹp không gian giữa các dòng. */
function distribute(
  sizes: number[],
  entries: readonly StackLayoutEntry[],
  amount: number,
  mode: "grow" | "shrink",
): void {
  let remaining = amount;
  while (remaining > 0) {
    const candidates = entries
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry, index }) =>
        mode === "grow"
          ? (entry.grow ?? 0) > 0 && (sizes[index] ?? 0) < (entry.maxSize ?? Number.MAX_SAFE_INTEGER)
          : (entry.shrink ?? 1) > 0 && (sizes[index] ?? 0) > (entry.minSize ?? 0),
      );
    if (candidates.length === 0) return;

    const totalWeight = candidates.reduce((sum, { entry, index }) => {
      const weight = mode === "grow" ? (entry.grow ?? 0) : (entry.shrink ?? 1) * Math.max(1, sizes[index] ?? 0);
      return sum + weight;
    }, 0);

    let moved = 0;
    for (const { entry, index } of candidates) {
      if (remaining <= 0) break;
      const weight = mode === "grow" ? (entry.grow ?? 0) : (entry.shrink ?? 1) * Math.max(1, sizes[index] ?? 0);
      const proposed = Math.max(1, Math.floor((remaining * weight) / totalWeight));
      const capacity =
        mode === "grow"
          ? (entry.maxSize ?? Number.MAX_SAFE_INTEGER) - (sizes[index] ?? 0)
          : (sizes[index] ?? 0) - (entry.minSize ?? 0);
      const delta = Math.min(remaining, proposed, capacity);
      if (delta <= 0) continue;
      sizes[index] = (sizes[index] ?? 0) + (mode === "grow" ? delta : -delta);
      remaining -= delta;
      moved += delta;
    }
    if (moved === 0) return;
  }
}

export interface StackEntryOptions {
  basis?: number | "auto";
  grow?: number;
  shrink?: number;
  minSize?: number;
  maxSize?: number;
  visible?: (viewport: LayoutViewport) => boolean;
}

export interface StackEntry extends StackEntryOptions {
  component: unknown;
}

export type StackChild = unknown | StackEntry;

export interface StackOptions {
  gap?: number;
  align?: "stretch" | "start" | "center" | "end";
}

export function isStackEntry(child: StackChild): child is StackEntry {
  return typeof child === "object" && child !== null && "component" in child;
}

/** Lọc các con đang hiển thị theo viewport. */
export function visibleStackEntries(
  entries: readonly StackLayoutEntry[],
  viewport: LayoutViewport,
): StackLayoutEntry[] {
  return entries.filter((entry) => entry.visible?.(viewport) ?? true);
}

/**
 * Phân bổ kích thước cho các con trong stack.
 * @param entries Danh sách con kèm tham số bố cục
 * @param intrinsicSizes Kích thước tự nhiên của từng con
 * @param availableSize Không gian khả dụng; undefined = giữ nguyên tự nhiên
 * @param gap Khoảng cách giữa các con
 */
export function allocateStackSizes(
  entries: readonly StackLayoutEntry[],
  intrinsicSizes: readonly number[],
  availableSize: number | undefined,
  gap: number,
): number[] {
  const sizes = entries.map((entry, index) =>
    clampSize(
      entry.basis === undefined || entry.basis === "auto" ? (intrinsicSizes[index] ?? 0) : entry.basis,
      entry,
    ),
  );
  if (availableSize === undefined) return sizes;

  const contentSize = Math.max(0, Math.floor(availableSize) - Math.max(0, entries.length - 1) * gap);
  const total = sizes.reduce((sum, size) => sum + size, 0);
  if (total < contentSize) distribute(sizes, entries, contentSize - total, "grow");
  else if (total > contentSize) distribute(sizes, entries, total - contentSize, "shrink");
  return sizes;
}

/** Chuẩn hóa gap/align cho constructor của HStack/VStack. */
export function resolveStackOptions(options: StackOptions = {}): {
  gap: number;
  align: "stretch" | "start" | "center" | "end";
} {
  return {
    gap: normalizeSize(options.gap, 0),
    align: options.align ?? "stretch",
  };
}
