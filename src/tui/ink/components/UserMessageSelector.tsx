// UserMessageSelector - chọn tin nhắn người dùng để fork nhánh
// Bắt chước nguyên tắc pi-mono components/user-message-selector.ts:
//   - Mỗi tin nhắn: dòng nội dung + dòng "Message i/n"
//   - Mũi tên lên/xuống có wrap; tiền chọn theo id ban đầu
//   - Enter chọn để nhánh; Esc hủy
// Port sang Ink TSX, khon copy code truc iep.

import React, { useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import { getTheme } from "../theme/index.js";
import { DynamicBorder } from "./DynamicBorder.js";
import { truncateToWidth } from "../core/index.js";

interface UserMessageItem {
  id: string;
  text: string;
}

const MAX_VISIBLE = 10;

export const UserMessageSelector: React.FC<{
  messages: UserMessageItem[];
  onSelect: (entryId: string) => void;
  onCancel: () => void;
  initialSelectedId?: string;
  width?: number;
}> = ({ messages, onSelect, onCancel, initialSelectedId, width = 80 }) => {
  const t = getTheme();
  const initialIndex = useMemo(() => {
    if (initialSelectedId) {
      const found = messages.findIndex((m) => m.id === initialSelectedId);
      if (found >= 0) return found;
    }
    return Math.max(0, messages.length - 1);
  }, [messages, initialSelectedId]);

  const [selected, setSelected] = useState(initialIndex);

  useInput((data, key) => {
    if (matchesEscape(data, key)) {
      onCancel();
      return;
    }
    if (key.return) {
      const message = messages[selected];
      if (message) onSelect(message.id);
      return;
    }
    if (key.upArrow) setSelected((i) => (i === 0 ? messages.length - 1 : i - 1));
    if (key.downArrow) setSelected((i) => (i === messages.length - 1 ? 0 : i + 1));
  });

  const start = Math.max(
    0,
    Math.min(selected - Math.floor(MAX_VISIBLE / 2), messages.length - MAX_VISIBLE),
  );
  const visible = messages.slice(start, start + MAX_VISIBLE);

  return (
    <Box flexDirection="column" width={width}>
      <DynamicBorder />
      <Text bold>{t.fg("accent", "Fork từ tin nhắn")}</Text>
      <Text>{t.fg("muted", "Chọn tin nhắn người dùng để sao chép đường dẫn hoạt động tới đó sang phiên mới")}</Text>
      <Text> </Text>
      {visible.length === 0 ? (
        <Text>{t.fg("muted", "  Không có tin nhắn người dùng")}</Text>
      ) : (
        visible.map((message, offset) => {
          const index = start + offset;
          const isSelected = index === selected;
          const cursor = isSelected ? t.fg("accent", "› ") : "  ";
          const normalized = message.text.replace(/\n/g, " ").trim();
          const truncated = truncateToWidth(normalized, Math.max(10, width - 4), "...");
          return (
            <React.Fragment key={message.id}>
              <Text>{isSelected ? t.fg("accent", `${cursor}${truncated}`) : `${cursor}${truncated}`}</Text>
              <Text>{t.fg("muted", `  Tin nhắn ${index + 1}/${messages.length}`)}</Text>
              <Text> </Text>
            </React.Fragment>
          );
        })
      )}
      {start > 0 || visible.length < messages.length ? (
        <Text>{t.fg("muted", `  (${selected + 1}/${messages.length})`)}</Text>
      ) : null}
      <DynamicBorder />
    </Box>
  );
};

function matchesEscape(data: string, key: { ctrl?: boolean; meta?: boolean }): boolean {
  return data === "\u001b" && !key.ctrl && !key.meta;
}
