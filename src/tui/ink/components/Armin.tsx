// Armin - easter egg hoạt hình bằng nghệ thuật XBM
// Bắt chước nguyên tắc pi-mono components/armin.ts:
//   - Ảnh XBM 31x36, LSB first, 1=nền, 0=tiền cảnh
//   - Render bằng half-block nên chiều cao hiển thị là một nửa
//   - 7 hiệu ứng: typewriter, scanline, rain, fade, crt, glitch, dissolve
//   - Hiệu ứng chạy theo fps riêng (glitch 60fps, còn lại 30fps)
//   - Cache dòng theo chiều rộng; invalidate xóa cache
// Port sang Ink TSX, khon copy code truc iep.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text } from "ink";
import { getTheme } from "../theme/index.js";

export const ARMIN_WIDTH = 31;
export const ARMIN_HEIGHT = 36;

const WIDTH = ARMIN_WIDTH;
const HEIGHT = ARMIN_HEIGHT;
const BYTES_PER_ROW = Math.ceil(WIDTH / 8);
const DISPLAY_HEIGHT = Math.ceil(HEIGHT / 2);

/** Bitmap XBM: mỗi byte 8 pixel theo hàng. */
const BITS: number[] = [
  0xff, 0xff, 0xff, 0x7f, 0xff, 0xf0, 0xff, 0x7f, 0xff, 0xed, 0xff, 0x7f, 0xff, 0xdb, 0xff, 0x7f, 0xff, 0xb7, 0xff,
  0x7f, 0xff, 0x77, 0xfe, 0x7f, 0x3f, 0xf8, 0xfe, 0x7f, 0xdf, 0xff, 0xfe, 0x7f, 0xdf, 0x3f, 0xfc, 0x7f, 0x9f, 0xc3,
  0xfb, 0x7f, 0x6f, 0xfc, 0xf4, 0x7f, 0xf7, 0x0f, 0xf7, 0x7f, 0xf7, 0xff, 0xf7, 0x7f, 0xf7, 0xff, 0xe3, 0x7f, 0xf7,
  0x07, 0xe8, 0x7f, 0xef, 0xf8, 0x67, 0x70, 0x0f, 0xff, 0xbb, 0x6f, 0xf1, 0x00, 0xd0, 0x5b, 0xfd, 0x3f, 0xec, 0x53,
  0xc1, 0xff, 0xef, 0x57, 0x9f, 0xfd, 0xee, 0x5f, 0x9f, 0xfc, 0xae, 0x5f, 0x1f, 0x78, 0xac, 0x5f, 0x3f, 0x00, 0x50,
  0x6c, 0x7f, 0x00, 0xdc, 0x77, 0xff, 0xc0, 0x3f, 0x78, 0xff, 0x01, 0xf8, 0x7f, 0xff, 0x03, 0x9c, 0x78, 0xff, 0x07,
  0x8c, 0x7c, 0xff, 0x0f, 0xce, 0x78, 0xff, 0xff, 0xcf, 0x7f, 0xff, 0xff, 0xcf, 0x78, 0xff, 0xff, 0xdf, 0x78, 0xff,
  0xff, 0xdf, 0x7d, 0xff, 0xff, 0x3f, 0x7e, 0xff, 0xff, 0xff, 0x7f,
];

type Effect = "typewriter" | "scanline" | "rain" | "fade" | "crt" | "glitch" | "dissolve";
const EFFECTS: Effect[] = ["typewriter", "scanline", "rain", "fade", "crt", "glitch", "dissolve"];

/** Pixel tại (x, y): true = tiền cảnh. */
export function isArminPixel(x: number, y: number): boolean {
  if (y >= HEIGHT) return false;
  const byteIndex = y * BYTES_PER_ROW + Math.floor(x / 8);
  const bitIndex = x % 8;
  return ((BITS[byteIndex]! >> bitIndex) & 1) === 0;
}

/** Ký tự cho một ô (2 pixel dọc gói ghém). */
function getChar(x: number, row: number): string {
  const upper = isArminPixel(x, row * 2);
  const lower = isArminPixel(x, row * 2 + 1);
  if (upper && lower) return "█";
  if (upper) return "▀";
  if (lower) return "▄";
  return " ";
}

/** Lưới ảnh cuối cùng. */
function buildFinalGrid(): string[][] {
  const grid: string[][] = [];
  for (let row = 0; row < DISPLAY_HEIGHT; row++) {
    const line: string[] = [];
    for (let x = 0; x < WIDTH; x++) line.push(getChar(x, row));
    grid.push(line);
  }
  return grid;
}

const emptyGrid = (): string[][] =>
  Array.from({ length: DISPLAY_HEIGHT }, () => Array(WIDTH).fill(" "));

const shuffled = (): Array<[number, number]> => {
  const positions: Array<[number, number]> = [];
  for (let row = 0; row < DISPLAY_HEIGHT; row++) {
    for (let x = 0; x < WIDTH; x++) positions.push([row, x]);
  }
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j]!, positions[i]!];
  }
  return positions;
};

interface EffectState {
  pos?: number;
  row?: number;
  expansion?: number;
  phase?: number;
  idx?: number;
  positions?: Array<[number, number]>;
  drops?: Array<{ y: number; settled: number }>;
}

/** Một bước của hiệu ứng; trả true khi hoàn thành. */
function tickEffect(
  effect: Effect,
  state: EffectState,
  current: string[][],
  final: string[][],
): boolean {
  switch (effect) {
    case "typewriter": {
      const pos = state.pos ?? 0;
      for (let i = 0; i < 3; i++) {
        const row = Math.floor(pos / WIDTH);
        const x = pos % WIDTH;
        if (row >= DISPLAY_HEIGHT) return true;
        current[row]![x] = final[row]![x]!;
        state.pos = pos + 1;
      }
      return false;
    }
    case "scanline": {
      const row = state.row ?? 0;
      if (row >= DISPLAY_HEIGHT) return true;
      for (let x = 0; x < WIDTH; x++) current[row]![x] = final[row]![x]!;
      state.row = row + 1;
      return false;
    }
    case "rain": {
      const drops = state.drops ?? [];
      const grid = emptyGrid();
      let allSettled = true;
      for (let x = 0; x < WIDTH; x++) {
        const drop = drops[x]!;
        for (let row = DISPLAY_HEIGHT - 1; row >= DISPLAY_HEIGHT - drop.settled; row--) {
          if (row >= 0) grid[row]![x] = final[row]![x]!;
        }
        if (drop.settled >= DISPLAY_HEIGHT) continue;
        allSettled = false;
        let targetRow = -1;
        for (let row = DISPLAY_HEIGHT - 1 - drop.settled; row >= 0; row--) {
          if (final[row]![x] !== " ") {
            targetRow = row;
            break;
          }
        }
        drop.y++;
        if (drop.y >= 0 && drop.y < DISPLAY_HEIGHT) {
          if (targetRow >= 0 && drop.y >= targetRow) {
            drop.settled = DISPLAY_HEIGHT - targetRow;
            drop.y = -Math.floor(Math.random() * 5) - 1;
          } else {
            grid[drop.y]![x] = "▓";
          }
        }
      }
      for (let r = 0; r < DISPLAY_HEIGHT; r++) current[r] = grid[r]!;
      return allSettled;
    }
    case "fade":
    case "dissolve": {
      const positions = state.positions ?? [];
      const idx = state.idx ?? 0;
      const perFrame = effect === "fade" ? 15 : 20;
      for (let i = 0; i < perFrame; i++) {
        if (idx >= positions.length) return true;
        const [row, x] = positions[idx]!;
        current[row]![x] = final[row]![x]!;
        state.idx = idx + 1;
      }
      return false;
    }
    case "crt": {
      const expansion = state.expansion ?? 0;
      const midRow = Math.floor(DISPLAY_HEIGHT / 2);
      const grid = emptyGrid();
      const top = midRow - expansion;
      const bottom = midRow + expansion;
      for (let row = Math.max(0, top); row <= Math.min(DISPLAY_HEIGHT - 1, bottom); row++) {
        for (let x = 0; x < WIDTH; x++) grid[row]![x] = final[row]![x]!;
      }
      for (let r = 0; r < DISPLAY_HEIGHT; r++) current[r] = grid[r]!;
      state.expansion = expansion + 1;
      return expansion > DISPLAY_HEIGHT;
    }
    case "glitch": {
      const phase = state.phase ?? 0;
      const glitchFrames = 8;
      if (phase < glitchFrames) {
        for (let r = 0; r < DISPLAY_HEIGHT; r++) {
          const offset = Math.floor(Math.random() * 7) - 3;
          const row = [...final[r]!];
          if (Math.random() < 0.3) {
            const shifted = row.slice(offset).concat(row.slice(0, offset));
            current[r] = shifted.slice(0, WIDTH);
          } else if (Math.random() < 0.2) {
            const swapRow = Math.floor(Math.random() * DISPLAY_HEIGHT);
            current[r] = [...final[swapRow]!];
          } else {
            current[r] = row;
          }
        }
        state.phase = phase + 1;
        return false;
      }
      for (let r = 0; r < DISPLAY_HEIGHT; r++) current[r] = [...final[r]!];
      return true;
    }
    default:
      return true;
  }
}

export const Armin: React.FC<{ width?: number }> = ({ width = 80 }) => {
  const t = getTheme();
  const [version, setVersion] = useState(0);
  const effect = useMemo(() => EFFECTS[Math.floor(Math.random() * EFFECTS.length)], []);
  const final = useMemo(() => buildFinalGrid(), []);
  const current = useRef<string[][]>(emptyGrid());
  const state = useRef<EffectState | null>(null);

  /**
   * Khởi tạo trạng thái hiệu ứng MỘT LẦN (lazy init qua hàm).
   *
   * Bản cũ khởi tạo trong thân component (một bare block chạy mỗi render), nên
   * `state.current = s` reset toàn bộ tiến trình hoạt hình ở mỗi frame: typewriter
   * không bao giờ vẽ quá 3 ô, fade/dissolve không tiến thêm, crt liên tục co lại.
   */
  const initialState = useCallback((): EffectState => {
    const s: EffectState = {};
    switch (effect) {
      case "typewriter":
        s.pos = 0;
        break;
      case "scanline":
        s.row = 0;
        break;
      case "rain":
        s.drops = Array.from({ length: WIDTH }, () => ({
          y: -Math.floor(Math.random() * DISPLAY_HEIGHT * 2),
          settled: 0,
        }));
        break;
      case "fade":
      case "dissolve":
        s.positions = shuffled();
        s.idx = 0;
        break;
      case "crt":
        s.expansion = 0;
        break;
      case "glitch":
        s.phase = 0;
        break;
    }
    return s;
  }, [effect]);

  const getState = useCallback((): EffectState => {
    if (state.current === null) state.current = initialState();
    // Non-null sau lazy init; TypeScript không suy được qua nên khẳng định tại đây.
    return state.current as EffectState;
  }, [initialState]);

  useEffect(() => {
    const fps = effect === "glitch" ? 60 : 30;
    const timer = setInterval(() => {
      const done = tickEffect(effect, getState(), current.current, final);
      setVersion((v) => v + 1);
      if (done) clearInterval(timer);
    }, 1000 / fps);
    return () => clearInterval(timer);
  }, [effect, final, getState]);

  const grid = current.current;
  const available = Math.max(0, width - 1);
  const message = "ARMIN SAYS HI";

  return (
    <Text>
      {grid.map((row, i) => (
        <React.Fragment key={`ar-${i}`}>
          {i > 0 ? "\n" : ""}
          {" "}
          {t.fg("accent", row.slice(0, available).join(""))}
          {" ".repeat(Math.max(0, width - 1 - row.slice(0, available).join("").length))}
        </React.Fragment>
      ))}
      {"\n "}
      {t.fg("accent", message)}
      {" ".repeat(Math.max(0, width - 1 - message.length))}
      {/* version chỉ là bộ đếm buộc React re-render mỗi frame; giá trị của nó
          không hiển thị. Bản cũ viết `{void version}` — biểu thức không sinh
          output nào nên không đảm bảo React coi là dependency đổi. */}
      <span hidden>{version}</span>
    </Text>
  );
};
