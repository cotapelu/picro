// ProviderBrand - kiểu chữ thương hiệu cho nhà cung cấp trong selector
// Bắt chước nguyên tắc pi-mono components/provider-brand.ts:
//   - Radius: bốn màu logo chảy qua chữ theo thời gian
//   - OpenRouter: sáng mờ chậm theo màu thương hiệu
//   - Chỉ áp cho dòng đang chọn; hoạt hình cập nhật theo requestRender
// Port sang TSX riêng, khon copy code truc iep.

import { type Color, foregroundAnsi, mixColors, parseColor } from "../core/index.js";
import { getTheme } from "../theme/index.js";

/** Hàm tô màu chữ theo thời gian (ms). */
export type ProviderBrandStyle = (text: string, elapsedMs: number) => string;

/** Kiểu thương hiệu của nhà cung cấp, hoặc undefined nếu không có. */
export function getProviderBrandStyle(providerId: string): ProviderBrandStyle | undefined {
  if (providerId === "radius") return radiusShimmer;
  if (providerId === "openrouter") return openRouterGlow;
  return undefined;
}

const RADIUS_COLORS: readonly Color[] = ["#4d9abf", "#83ccd2", "#f1be57", "#f09082"].map((hex) => parseColor(hex));
const CHARS_PER_COLOR = 4;
const CHARS_PER_SECOND = 10;

/** Tô chữ với bốn màu logo Radius chảy trái sang phải. */
export function radiusShimmer(text: string, elapsedMs: number): string {
  const t = getTheme();
  const mode = t.getColorMode();
  const cycle = RADIUS_COLORS.length * CHARS_PER_COLOR;
  const offset = (elapsedMs / 1000) * CHARS_PER_SECOND;
  let result = "";
  let index = 0;
  for (const char of text) {
    const position = (((index - offset) % cycle) + cycle) % cycle;
    const band = Math.floor(position / CHARS_PER_COLOR);
    const amount = position / CHARS_PER_COLOR - band;
    // Smoothstep giữ mỗi dải màu nhận diện được nhưng vẫn hòa vào dải sau.
    const smooth = amount * amount * (3 - 2 * amount);
    const from = RADIUS_COLORS[band]!;
    const to = RADIUS_COLORS[(band + 1) % RADIUS_COLORS.length]!;
    result += foregroundAnsi(mixColors(from, to, smooth, "srgb"), mode) + char;
    index++;
  }
  return `${result}\x1b[39m`;
}

const OPENROUTER_GLOW = {
  dark: { base: parseColor("#c6f243"), peak: parseColor("#efffb0") },
  light: { base: parseColor("#5d32e1"), peak: parseColor("#8f6bff") },
} as const;
const GLOW_PERIOD_MS = 2400;
const ANIMATION_FRAME_MS = 50;

/** Tô chữ màu thương hiệu OpenRouter, sáng mờ chậm. */
function openRouterGlow(text: string, elapsedMs: number): string {
  const t = getTheme();
  const { base, peak } = OPENROUTER_GLOW[t.appearance];
  const amount = (1 - Math.cos((2 * Math.PI * elapsedMs) / GLOW_PERIOD_MS)) / 2;
  return `${foregroundAnsi(mixColors(base, peak, amount, "oklch"), t.getColorMode())}${text}\x1b[39m`;
}

/** Vòng lặp yêu cầu render khi đang hoạt hình. */
export function startBrandAnimation(
  render: () => void,
  isAnimating: () => boolean,
): () => void {
  const timer = setInterval(() => {
    if (isAnimating()) render();
  }, ANIMATION_FRAME_MS);
  timer.unref?.();
  return () => clearInterval(timer);
}
