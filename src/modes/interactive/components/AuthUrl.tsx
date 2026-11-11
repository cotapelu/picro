// AuthUrl - hiển thị URL đăng nhập kèm gợi ý bấm và sao chép
// Bắt chước nguyên tắc pi-mono components/auth-url.ts:
//   - URL tô màu accent, bọc liên kết OSC8 khi terminal hỗ trợ
//   - Dòng gợi ý: bấm để mở + phím tắt sao chép
//   - copy() sao chép URL và cập nhật gợi ý theo kết quả
// Port sang Ink TSX, khon copy code truc iep.

import React, { useState } from "react";
import { Box, Text } from "ink";
import { getTheme } from "../theme/theme.js";
import { getCapabilities, hyperlink } from "../../../tui/ink/core/index.js";

export interface AuthUrlProps {
  url: string;
  /** Gợi ý phím sao chép, ví dụ "Ctrl+C". */
  copyHint?: string;
  onCopy?: (url: string) => void | Promise<void>;
  width?: number;
}

export const AuthUrl: React.FC<AuthUrlProps> = ({ url, copyHint = "Ctrl+C", onCopy, width = 80 }) => {
  const t = getTheme();
  const [hint, setHint] = useState<string | undefined>(undefined);
  const supportsLinks = getCapabilities().hyperlinks;
  const clickHint = process.platform === "darwin" ? "Cmd+click để mở" : "Ctrl+click để mở";

  const linkText = supportsLinks ? hyperlink(url, url) : url;
  const clickLine = supportsLinks ? hyperlink(clickHint, url) : clickHint;

  const doCopy = async () => {
    try {
      await onCopy?.(url);
      setHint(t.fg("success", "Đã chép URL"));
    } catch (error) {
      setHint(t.fg("error", error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <Box flexDirection="column">
      <Text>{t.fg("accent", linkText)}</Text>
      <Text>
        {t.fg("dim", clickLine)} {t.fg("dim", "·")} {hint ?? t.fg("dim", `${copyHint} để sao chép`)}
      </Text>
    </Box>
  );
};

export async function copyAuthUrl(url: string): Promise<boolean> {
  try {
    const { getNativeClipboard } = await import("../../../tui/ink/core/index.js");
    const clipboard = getNativeClipboard();
    if (clipboard?.setText) {
      await clipboard.setText(url);
      return true;
    }
    process.stdout.write(`\x1b]52;c;${Buffer.from(url).toString("base64")}\x07`);
    return true;
  } catch {
    return false;
  }
}
