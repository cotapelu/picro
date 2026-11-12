// Colors - hệ thống màu và định dạng kiểu chữ
// Bắt chước nguyên tắc pi-tui colors.ts:
//   - indexedColor / rgbColor / oklchColor: ba kiểu màu nền tảng
//   - parseColor: nhận "#rrggbb", "rgb(...)", "oklch(...)", số chỉ mục
//   - colorToRgb / colorToHex / mixColors / colorToOklch
//   - foregroundAnsi / backgroundAnsi: sinh escape theo chế độ màu
//   - styleText / styleTextWithAnsi: gói escape theo thứ tự đóng ngược
// Port sang TSX riêng, khong copy code truc iep.

export type TerminalColorMode = "256color" | "truecolor";
export type ColorMixSpace = "oklch" | "srgb";

export interface RgbColorValue {
  readonly kind: "rgb";
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface IndexedColor {
  readonly kind: "indexed";
  readonly index: number;
}

export interface OklchColorValue {
  readonly kind: "oklch";
  readonly l: number;
  readonly c: number;
  readonly h: number;
}

export type Color = IndexedColor | RgbColorValue | OklchColorValue;

export interface TextAttributes {
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
  inverse?: boolean;
  strikethrough?: boolean;
}

export interface TextStyle extends TextAttributes {
  fg?: Color;
  bg?: Color;
}

function requireFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new Error(`${name} must be finite`);
}

export function indexedColor(index: number): IndexedColor {
  if (!Number.isInteger(index) || index < 0 || index > 255) throw new Error("ANSI index must be 0..255");
  return Object.freeze({ kind: "indexed", index });
}

export function rgbColor(r: number, g: number, b: number): RgbColorValue {
  for (const [name, value] of [["r", r], ["g", g], ["b", b]] as const) {
    requireFinite(value, name);
    if (value < 0 || value > 255) throw new Error(`${name} phải trong 0..255`);
  }
  return Object.freeze({ kind: "rgb", r, g, b });
}

export function oklchColor(l: number, c: number, h: number): OklchColorValue {
  requireFinite(l, "l");
  requireFinite(c, "c");
  requireFinite(h, "h");
  if (l < 0 || l > 1) throw new Error("l phải trong 0..1");
  if (c < 0) throw new Error("c không được âm");
  return Object.freeze({ kind: "oklch", l, c, h: ((h % 360) + 360) % 360 });
}

const NUMBER_PATTERN = String.raw`[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?`;
const OKLCH_PATTERN = new RegExp(
  `^oklch\\(\\s*(${NUMBER_PATTERN})(%)?\\s+(${NUMBER_PATTERN})\\s+(${NUMBER_PATTERN})(?:deg)?\\s*\\)$`, "i",
);
const OKHSL_PATTERN = new RegExp(
  `^okhsl\\(\\s*(${NUMBER_PATTERN})(%)?\\s+(${NUMBER_PATTERN})(%)?\\s+(${NUMBER_PATTERN})(%)?\\s*\\)$`, "i",
);

export function parseColor(value: string | number): Color {
  if (typeof value === "number") return indexedColor(value);

  const hex = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(value);
  if (hex) {
    const digits = hex[1]!.length === 3 ? [...hex[1]!].map((d) => d + d).join("") : hex[1]!;
    return rgbColor(
      Number.parseInt(digits.slice(0, 2), 16),
      Number.parseInt(digits.slice(2, 4), 16),
      Number.parseInt(digits.slice(4, 6), 16),
    );
  }
  const oklch = OKLCH_PATTERN.exec(value);
  if (oklch) {
    const lightness = Number.parseFloat(oklch[1]!) / (oklch[2] ? 100 : 1);
    return oklchColor(lightness, Number.parseFloat(oklch[3]!), Number.parseFloat(oklch[4]!));
  }
  const okhsl = OKHSL_PATTERN.exec(value);
  if (okhsl) {
    // Groups: 1=hue 2=hue% 3=saturation 4=sat% 5=lightness 6=light%.
    //
    // The pattern only allowed a "%" after the hue and the branch read the
    // groups as if one existed, so "okhsl(295 50% 67%)" (the syntax every
    // built-in theme uses) failed to match at all and parseColor threw, while
    // the unitless form read the saturation group as a percent flag and the
    // lightness group as the saturation - silently collapsing saturation to
    // NaN (rendered as 0, i.e. a grey) for every colour.
    const hue = Number.parseFloat(okhsl[1]!);
    const saturation = Number.parseFloat(okhsl[3]!) / (okhsl[4] ? 100 : 1);
    const lightness = Number.parseFloat(okhsl[5]!) / (okhsl[6] ? 100 : 1);
    return okhslColor(hue, saturation, lightness);
  }
  throw new Error(`Giá trị màu không hợp lệ: ${value}`);
}

const BASIC_COLORS: readonly RgbColorValue[] = [
  { kind: "rgb", r: 0, g: 0, b: 0 }, { kind: "rgb", r: 128, g: 0, b: 0 },
  { kind: "rgb", r: 0, g: 128, b: 0 }, { kind: "rgb", r: 128, g: 128, b: 0 },
  { kind: "rgb", r: 0, g: 0, b: 128 }, { kind: "rgb", r: 128, g: 0, b: 128 },
  { kind: "rgb", r: 0, g: 128, b: 128 }, { kind: "rgb", r: 192, g: 192, b: 192 },
  { kind: "rgb", r: 128, g: 128, b: 128 }, { kind: "rgb", r: 255, g: 0, b: 0 },
  { kind: "rgb", r: 0, g: 255, b: 0 }, { kind: "rgb", r: 255, g: 255, b: 0 },
  { kind: "rgb", r: 0, g: 0, b: 255 }, { kind: "rgb", r: 255, g: 0, b: 255 },
  { kind: "rgb", r: 0, g: 255, b: 255 }, { kind: "rgb", r: 255, g: 255, b: 255 },
] as const;
const CUBE_VALUES = [0, 95, 135, 175, 215, 255] as const;
const GRAY_VALUES = Array.from({ length: 24 }, (_, i) => 8 + i * 10);

export function indexedToRgbPublic(index: number): RgbColorValue {
  if (index < 16) return { ...BASIC_COLORS[index]!, kind: "rgb" };
  if (index < 232) {
    const cube = index - 16;
    return {
      kind: "rgb",
      r: CUBE_VALUES[Math.floor(cube / 36)]!,
      g: CUBE_VALUES[Math.floor((cube % 36) / 6)]!,
      b: CUBE_VALUES[cube % 6]!,
    };
  }
  const gray = 8 + (index - 232) * 10;
  return { kind: "rgb", r: gray, g: gray, b: gray };
}

export function colorToRgb(color: Color): RgbColorValue {
  switch (color.kind) {
    case "indexed":
      return indexedToRgbPublic(color.index);
    case "rgb":
      return color;
    case "oklch": {
      const { r, g, b } = oklchToRgbChannels(color);
      return { kind: "rgb", r, g, b };
    }
  }
}

/** Chuyển OKLCH sang kênh sRGB với giới hạn gamut bằng bisection chroma. */
function oklchToRgbChannels({ l, c, h }: OklchColorValue): { r: number; g: number; b: number } {
  const radians = (h * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const atChroma = (chroma: number): [number, number, number] =>
    oklabToLinearSrgb([l, chroma * cos, chroma * sin]);

  const direct = atChroma(c);
  if (direct.every((ch) => ch >= -1e-7 && ch <= 1 + 1e-7)) {
    return linearSrgbToRgbValue(direct);
  }
  let linear = atChroma(0);
  let low = 0;
  let high = c;
  for (let i = 0; i < 20; i++) {
    const chroma = (low + high) / 2;
    const candidate = atChroma(chroma);
    if (candidate.every((ch) => ch >= -1e-7 && ch <= 1 + 1e-7)) {
      low = chroma;
      linear = candidate;
    } else {
      high = chroma;
    }
  }
  return linearSrgbToRgbValue(linear);
}

export function colorToHex(color: Color): string {
  const { r, g, b } = colorToRgb(color);
  const ch = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return `#${ch(r)}${ch(g)}${ch(b)}`;
}

export function colorToOklch(color: Color) {
  const rgb = colorToRgb(color);
  const [l, a, b] = rgbToOklab(rgb);
  return { l, c: Math.hypot(a, b), h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 };
}

/** Pha trộn hai màu theo không gian oklch (mặc định) hoặc srgb. */
export function mixColors(first: Color, second: Color, amount: number, space: ColorMixSpace = "oklch"): Color {
  requireFinite(amount, "amount");
  if (amount < 0 || amount > 1) throw new Error("amount phải trong 0..1");

  if (space === "srgb") {
    const a = colorToRgb(first);
    const b = colorToRgb(second);
    return rgbColor(
      a.r + (b.r - a.r) * amount,
      a.g + (b.g - a.g) * amount,
      a.b + (b.b - a.b) * amount,
    );
  }
  const a = colorToOklch(first);
  const b = colorToOklch(second);
  const firstHue = a.c < 1e-7 ? b.h : a.h;
  const secondHue = b.c < 1e-7 ? firstHue : b.h;
  const hueDelta = ((secondHue - firstHue + 540) % 360) - 180;
  return oklchColor(a.l + (b.l - a.l) * amount, a.c + (b.c - a.c) * amount, firstHue + hueDelta * amount);
}

function findClosest(values: readonly number[], target: number): number {
  let bestIndex = 0;
  let best = Infinity;
  for (let i = 0; i < values.length; i++) {
    const distance = Math.abs(target - values[i]!);
    if (distance < best) {
      bestIndex = i;
      best = distance;
    }
  }
  return bestIndex;
}

function colorDistance(a: RgbColorValue, b: RgbColorValue): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114;
}

function rgbToAnsi256(color: RgbColorValue): number {
  const rIndex = findClosest(CUBE_VALUES, color.r);
  const gIndex = findClosest(CUBE_VALUES, color.g);
  const bIndex = findClosest(CUBE_VALUES, color.b);
  const cube = { r: CUBE_VALUES[rIndex]!, g: CUBE_VALUES[gIndex]!, b: CUBE_VALUES[bIndex]! };
  const cubeIndex = 16 + 36 * rIndex + 6 * gIndex + bIndex;
  const gray = Math.round(0.299 * color.r + 0.587 * color.g + 0.114 * color.b);
  const grayIndex = findClosest(GRAY_VALUES, gray);
  const grayValue = GRAY_VALUES[grayIndex]!;
  const spread = Math.max(color.r, color.g, color.b) - Math.min(color.r, color.g, color.b);
  const grayColor: RgbColorValue = { kind: "rgb", r: grayValue, g: grayValue, b: grayValue };
  const cubeColor: RgbColorValue = { kind: "rgb", r: cube.r, g: cube.g, b: cube.b };
  if (spread < 10 && colorDistance(color, grayColor) < colorDistance(color, cubeColor)) {
    return 232 + grayIndex;
  }
  return cubeIndex;
}

function colorAnsi(color: Color, mode: TerminalColorMode, background: boolean): string {
  if (color.kind === "indexed") {
    return `\x1b[${background ? 48 : 38};5;${color.index}m`;
  }
  const rgb = colorToRgb(color);
  if (mode === "truecolor") {
    return `\x1b[${background ? 48 : 38};2;${Math.round(rgb.r)};${Math.round(rgb.g)};${Math.round(rgb.b)}m`;
  }
  return `\x1b[${background ? 48 : 38};5;${rgbToAnsi256(rgb)}m`;
}

export function foregroundAnsi(color: Color, mode: TerminalColorMode): string {
  return colorAnsi(color, mode, false);
}

export function backgroundAnsi(color: Color, mode: TerminalColorMode): string {
  return colorAnsi(color, mode, true);
}

/** Tô màu và kiểu chữ với escape cấu hình được. */
export function styleText(text: string, options: TextStyle, mode: TerminalColorMode): string {
  return styleTextWithAnsi(
    text,
    options.fg ? foregroundAnsi(options.fg, mode) : undefined,
    options.bg ? backgroundAnsi(options.bg, mode) : undefined,
    options,
  );
}

/** Như styleText nhưng nhận sẵn escape màu (đã tính trước đó). */
export function styleTextWithAnsi(
  text: string,
  fgAnsi: string | undefined,
  bgAnsi: string | undefined,
  options: TextAttributes,
): string {
  let prefix = "";
  let suffix = "";
  if (fgAnsi) {
    prefix += fgAnsi;
    suffix = "\x1b[39m";
  }
  if (bgAnsi) {
    prefix += bgAnsi;
    suffix = `\x1b[49m${suffix}`;
  }
  if (options.bold) prefix += "\x1b[1m";
  if (options.dim) prefix += "\x1b[2m";
  if (options.bold || options.dim) suffix = `\x1b[22m${suffix}`;
  if (options.italic) {
    prefix += "\x1b[3m";
    suffix = `\x1b[23m${suffix}`;
  }
  if (options.underline) {
    prefix += "\x1b[4m";
    suffix = `\x1b[24m${suffix}`;
  }
  if (options.inverse) {
    prefix += "\x1b[7m";
    suffix = `\x1b[27m${suffix}`;
  }
  if (options.strikethrough) {
    prefix += "\x1b[9m";
    suffix = `\x1b[29m${suffix}`;
  }
  return `${prefix}${text}${suffix}`;
}

// ============================================================================
/** Chuyển không gian màu (bản tối giản, giữ đúng công thức tham chiếu) — trả về RgbColorValue. */
// ============================================================================

type Vec3 = [number, number, number];

const multiply = (m: Vec3[], [x, y, z]: Vec3): Vec3 =>
  m.map((row) => row[0]! * x + row[1]! * y + row[2]! * z) as Vec3;

const LINEAR_SRGB_TO_LMS: Vec3[] = [
  [0.4122214694707629, 0.5363325372617349, 0.0514459932675022],
  [0.2119034958178251, 0.6806995506452344, 0.1073969535369405],
  [0.0883024591900564, 0.2817188391361215, 0.6299787016738222],
];
const LMS_TO_LAB: Vec3[] = [
  [0.210454268309314, 0.793617774702305, -0.0040720430116193],
  [1.9779985324311684, -2.42859224204858, 0.450593709617411],
  [0.0259040424655478, 0.7827717124575296, -0.8086757549230774],
];
const LAB_TO_LMS: Vec3[] = [
  [1, 0.3963377773761749, 0.2158037573099136],
  [1, -0.1055613458156586, -0.0638541728258133],
  [1, -0.0894841775298119, -1.2914855480194092],
];
const LMS_TO_LINEAR_SRGB: Vec3[] = [
  [4.0767416360759583, -3.3077115392580629, 0.2309699031821043],
  [-1.268437973285031, 2.6097573492876882, -0.341319376002657],
  [-0.0041960761386756, -0.7034186179359362, 1.7076146940746117],
];

const linearToSrgb = (v: number): number =>
  v > 0.0031308 ? 1.055 * v ** (1 / 2.4) - 0.055 : 12.92 * v;
const srgbToLinear = (v: number): number =>
  v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;

function linearSrgbToRgbValue(linear: Vec3): RgbColorValue {
  const [r, g, b] = linear.map((v) => Math.round(Math.min(1, Math.max(0, linearToSrgb(v))) * 255)) as Vec3;
  return { kind: "rgb", r, g, b };
}

function oklabToLinearSrgb(lab: Vec3): Vec3 {
  return multiply(LMS_TO_LINEAR_SRGB, multiply(LAB_TO_LMS, lab).map((v) => v ** 3) as Vec3);
}

export function rgbToOklab({ r, g, b }: RgbColorValue): Vec3 {
  const linear = [r / 255, g / 255, b / 255].map(srgbToLinear) as Vec3;
  return multiply(LMS_TO_LAB, linear.map(Math.cbrt) as Vec3);
}

function okhslToOklabLightness(x: number): number {
  return (x * x + 0.206 * x) / (1.04812 * (x + 0.03));
}

function lmsSlopes(a: number, b: number): Vec3 {
  return [LAB_TO_LMS[0]!, LAB_TO_LMS[1]!, LAB_TO_LMS[2]!].map((row) => row[1]! * a + row[2]! * b) as Vec3;
}

function maxSaturation(a: number, b: number): number {
  const channel =
    [
      [[-1.8817031, -0.80936501], [1.19086277, 1.76576728, 0.59662641, 0.75515197, 0.56771245]],
      [[1.8144408, -1.19445267], [0.73956515, -0.45954404, 0.08285427, 0.12541073, -0.14503204]],
      [[0.13110758, 1.81333971], [1.35733652, -0.00915799, -1.1513021, -0.50559606, 0.00692117]],
    ] as const;
  const picked = channel.findIndex(([[x, y]], index) => index === 2 || x * a + y * b > 1);
  const [k0, k1, k2, k3, k4] = channel[picked]![1];
  const weights = LMS_TO_LINEAR_SRGB[picked]!;
  const saturation = k0 + k1 * a + k2 * b + k3 * a * a + k4 * a * b;
  const slopes = lmsSlopes(a, b);
  const base = slopes.map((k) => 1 + saturation * k);
  const dot = (values: number[]) => values.reduce((sum, v, i) => sum + weights[i]! * v, 0);
  const f = dot(base.map((v) => v ** 3));
  const f1 = dot(base.map((v, i) => 3 * slopes[i]! * v ** 2));
  const f2 = dot(base.map((v, i) => 6 * slopes[i]! ** 2 * v));
  return saturation - (f * f1) / (f1 * f1 - 0.5 * f * f2);
}

function cusp(a: number, b: number): [number, number] {
  const saturation = maxSaturation(a, b);
  const lightness = Math.cbrt(1 / Math.max(...oklabToLinearSrgb([1, saturation * a, saturation * b])));
  return [lightness, lightness * saturation];
}

function maxChroma(a: number, b: number, lightness: number, [cuspL, cuspC]: [number, number]): number {
  if (lightness <= cuspL) return (cuspC * lightness) / cuspL;
  const t = (cuspC * (lightness - 1)) / (cuspL - 1);
  const slopes = lmsSlopes(a, b);
  const lms = slopes.map((k) => lightness + t * k);
  const cubes = lms.map((v) => v ** 3);
  const first = lms.map((v, i) => 3 * slopes[i]! * v ** 2);
  const second = lms.map((v, i) => 6 * slopes[i]! ** 2 * v);
  const dot = (row: Vec3, values: number[]) => row[0]! * values[0]! + row[1]! * values[1]! + row[2]! * values[2]!;
  const steps = LMS_TO_LINEAR_SRGB.map((row) => {
    const f = dot(row, cubes) - 1;
    const f1 = dot(row, first);
    const f2 = dot(row, second);
    const u = f1 / (f1 * f1 - 0.5 * f * f2);
    return u >= 0 ? -f * u : Number.MAX_VALUE;
  });
  return t + Math.min(...steps);
}

function chromaStops(L: number, a: number, b: number): [number, number, number] {
  const peak = cusp(a, b);
  const cMax = maxChroma(a, b, L, peak);
  const k = cMax / Math.min(L * (peak[1] / peak[0]), (1 - L) * (peak[1] / (1 - peak[0])));
  const midS =
    0.11516993 +
    1 /
      (7.4477897 +
        4.1590124 * b +
        a *
          (-2.19557347 +
            1.75198401 * b +
            a * (-2.13704948 - 10.02301043 * b + a * (-4.24894561 + 5.38770819 * b + 4.69891013 * a))));
  const midT =
    0.11239642 +
    1 /
      (1.6132032 -
        0.68124379 * b +
        a *
          (0.40370612 +
            0.90148123 * b +
            a * (-0.27087943 + 0.6122399 * b + a * (0.00299215 - 0.45399568 * b - 0.14661872 * a))));
  const cMid = 0.9 * k * Math.sqrt(Math.sqrt(1 / (1 / (L * midS) ** 4 + 1 / ((1 - L) * midT) ** 4)));
  const c0 = Math.sqrt(1 / (1 / (L * 0.4) ** 2 + 1 / ((1 - L) * 0.8) ** 2));
  return [c0, cMid, cMax];
}

export function okhslToRgb(hue: number, saturation: number, lightness: number): RgbColorValue {
  const L = okhslToOklabLightness(lightness);
  let lab: Vec3 = [L, 0, 0];
  if (L > 0 && L < 1 && saturation > 0) {
    const angle = (2 * Math.PI * (((hue % 360) + 360) % 360)) / 360;
    const a = Math.cos(angle);
    const b = Math.sin(angle);
    const [c0, cMid, cMax] = chromaStops(L, a, b);
    let chroma: number;
    if (saturation < 0.8) {
      const t = 1.25 * saturation;
      const k1 = 0.8 * c0;
      chroma = (t * k1) / (1 - (1 - k1 / cMid) * t);
    } else {
      const t = 5 * (saturation - 0.8);
      const k1 = (0.2 * cMid ** 2 * 1.25 ** 2) / c0;
      chroma = cMid + (t * k1) / (1 - (1 - k1 / (cMax - cMid)) * t);
    }
    lab = [L, chroma * a, chroma * b];
  }
  return linearSrgbToRgbValue(oklabToLinearSrgb(lab));
}

export function rgbToOkhsl(rgb: RgbColorValue): { h: number; s: number; l: number } {
  const [L, labA, labB] = rgbToOklab(rgb);
  const chroma = Math.hypot(labA, labB);
  const l = okhslLightnessFromL(L);
  if (chroma < 1e-9 || l <= 0 || l >= 1) return { h: 0, s: 0, l };
  const h = ((Math.atan2(labB, labA) * 180) / Math.PI + 360) % 360;
  const [c0, cMid, cMax] = chromaStops(L, labA / chroma, labB / chroma);
  let s: number;
  if (chroma < cMid) {
    const k1 = 0.8 * c0;
    s = 0.8 * (chroma / (k1 + (1 - k1 / cMid) * chroma));
  } else {
    const k1 = (0.2 * cMid ** 2 * 1.25 ** 2) / c0;
    const offset = chroma - cMid;
    s = 0.8 + 0.2 * (offset / (k1 + (1 - k1 / (cMax - cMid)) * offset));
  }
  return { h, s: Math.min(1, Math.max(0, s)), l };
}

const K1 = 0.206;
const K2 = 0.03;
const K3 = (1 + K1) / (1 + K2);

/** Oklab L sang OKHSL L. */
export function oklabToOkhslLightness(x: number): number {
  return 0.5 * (K3 * x - K1 + Math.sqrt((K3 * x - K1) ** 2 + 4 * K2 * K3 * x));
}

/** OKHSL L sang Oklab L. */
function okhslToOklabLightnessFromOkhsl(x: number): number {
  return (x * x + K1 * x) / (K3 * (x + K2));
}

function okhslLightnessFromL(L: number): number {
  return oklabToOkhslLightness(L);
}

export function okhslColor(h: number, s: number, l: number): RgbColorValue {
  return okhslToRgb(h, s, l);
}
