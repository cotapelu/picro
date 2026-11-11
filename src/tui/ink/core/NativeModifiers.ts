// NativeModifiers - kiểm tra phím bổ trỡ đang được nhấn
// Bắt chước nguyên tắc pi-tui native-modifiers.ts.
// Port sang TSX riêng, khong copy code truc iep.

import { getNativePlatformHelper, type ModifierKey } from "./NativePlatform.js";

export type { ModifierKey } from "./NativePlatform.js";

/** Kiểm tra một phím bổ trợ có đang được nhấn không. */
export function isNativeModifierPressed(key: ModifierKey): boolean {
  const helper = getNativePlatformHelper();
  if (!helper?.isModifierPressed) return false;
  try {
    return helper.isModifierPressed(key) === true;
  } catch {
    return false;
  }
}
