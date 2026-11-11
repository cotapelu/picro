// FormatCwd - rút gọn đường dẫn thư mục cho thanh trạng thái
// Bắt chước nguyên tắc pi-mono footer.ts formatCwdForFooter():
//   - Thay thư mục nhà bằng "~"
//   - Giữ nguyên đường dẫn nằm ngoài thư mục nhà
// Port sang Ink TSX, khong copy code truc iep.

import { resolve, relative, sep, isAbsolute } from "node:path";

export function formatCwdForFooter(cwd: string, home: string | undefined): string {
  if (!home) return cwd;

  const resolvedCwd = resolve(cwd);
  const resolvedHome = resolve(home);
  const relativeToHome = relative(resolvedHome, resolvedCwd);
  const isInsideHome =
    relativeToHome === "" ||
    (relativeToHome !== ".." && !relativeToHome.startsWith(`..${sep}`) && !isAbsolute(relativeToHome));

  if (!isInsideHome) return cwd;
  return relativeToHome === "" ? "~" : `~${sep}${relativeToHome}`;
}
