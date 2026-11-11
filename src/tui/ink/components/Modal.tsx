// Modal - lớp phủ hiển thị hội thoại/ngữ cảnh giữa màn hình
// Bắt chước nguyên tắc pi-mono overlay: viền động hai đầu, lề trong,
// nội dung do từng loại modal tự cung cấp, có phím tắt đóng.
// Viet lai bang Ink TSX, khong copy code truc tiep.

import React from "react";
import { Box, Text } from "ink";
import { theme, fg, bg } from "../theme/index.js";

interface ModalProps {
  modal: {
    type:
      | "none"
      | "login"
      | "help"
      | "thinking"
      | "confirmation"
      | "session-selector"
      | "model-selector"
      | "settings"
      | "custom"
      | "theme-selector";
    props?: Record<string, any>;
    onConfirm?: (result?: any) => void;
    onCancel?: () => void;
  };
}

/** Đường kẻ ngang theo chiều rộng khả dụng (giống DynamicBorder). */
const DynamicBorder: React.FC<{ color?: (t: string) => string }> = ({ color = theme.dim }) => (
  <Text>{color("─".repeat(78))}</Text>
);

const HelpBody: React.FC = () => (
  <Box flexDirection="column">
    <Text bold>{fg("accent", "Trợ giúp")}</Text>
    <Text>{fg("text", "/thinking [mức]  đặt cấp độ suy nghĩ")}</Text>
    <Text>{fg("text", "/login            đăng nhập nhà cung cấp")}</Text>
    <Text>{fg("text", "/copy [all]       chép hội thoại")}</Text>
    <Text>{fg("text", "/resume           mở lại phiên cũ")}</Text>
    <Text>{fg("text", "/new              tạo phiên mới")}</Text>
    <Text>{fg("text", "/quit             thoát")}</Text>
  </Box>
);

const ThinkingBody: React.FC<{ props?: Record<string, any> }> = ({ props }) => {
  const levels = ["off", "minimal", "low", "medium", "high", "xhigh"];
  const current = props?.current ?? "medium";
  return (
    <Box flexDirection="column">
      <Text bold>{fg("accent", "Cấp độ suy nghĩ")}</Text>
      <Text>{fg("muted", "Hiện tại: ")}{fg("text", String(current))}</Text>
      <Text>{fg("muted", "Các mức: ")}{fg("text", levels.join(", "))}</Text>
    </Box>
  );
};

const LoginBody: React.FC = () => (
  <Box flexDirection="column">
    <Text bold>{fg("accent", "Đăng nhập")}</Text>
    <Text>{fg("text", "Nhập khóa API khi được hỏi.")}</Text>
    <Text>{fg("dim", "(lưu tại ~/.pi/agent/auth.json)")}</Text>
  </Box>
);

const ConfirmBody: React.FC<{ props?: Record<string, any> }> = ({ props }) => (
  <Box flexDirection="column">
    <Text bold>{fg("warning", props?.title ?? "Xác nhận")}</Text>
    <Text>{fg("text", props?.message ?? "")}</Text>
  </Box>
);

const SettingsBody: React.FC<{ props?: Record<string, any> }> = ({ props }) => (
  <Box flexDirection="column">
    <Text bold>{fg("accent", "Cài đặt")}</Text>
    <Text>{fg("muted", "Chủ đề: ")}{fg("text", props?.theme ?? "mặc định")}</Text>
    <Text>
      {fg("muted", "Công cụ tắt: ")}
      {fg("text", (props?.disabledTools ?? []).join(", ") || "không")}
    </Text>
    <Text>{fg("muted", "Nhà cung cấp: ")}{fg("text", props?.defaultProvider ?? "chưa đặt")}</Text>
    <Text>{fg("muted", "Mô hình: ")}{fg("text", props?.defaultModel ?? "chưa đặt")}</Text>
  </Box>
);

const SessionListBody: React.FC<{ props?: Record<string, any> }> = ({ props }) => {
  const sessions: Array<{ id: string; cwd?: string }> = props?.sessions ?? [];
  return (
    <Box flexDirection="column">
      <Text bold>{fg("accent", "Chọn phiên")}</Text>
      {sessions.length ? (
        sessions.map((s, i) => (
          <Text key={s.id}>
            {fg("muted", `${i + 1}.`)} {fg("text", s.id)}{s.cwd ? fg("dim", ` (${s.cwd})`) : ""}
          </Text>
        ))
      ) : (
        <Text>{fg("dim", "Chưa có phiên nào")}</Text>
      )}
    </Box>
  );
};

const ModelListBody: React.FC<{ props?: Record<string, any> }> = ({ props }) => {
  const models: Array<{ id: string; provider: string }> = props?.models ?? [];
  return (
    <Box flexDirection="column">
      <Text bold>{fg("accent", "Chọn mô hình")}</Text>
      <Text>{fg("muted", "Hiện tại: ")}{fg("text", props?.current ?? "chưa có")}</Text>
      {models.length ? (
        models.map((m) => (
          <Text key={`${m.provider}/${m.id}`}>
            {fg("text", m.id)} {fg("dim", `[${m.provider}]`)}
          </Text>
        ))
      ) : (
        <Text>{fg("dim", "Không có mô hình")}</Text>
      )}
    </Box>
  );
};

const ThemeListBody: React.FC<{ props?: Record<string, any> }> = ({ props }) => {
  const themes = ["dark", "light", "matrix"];
  const current = props?.current ?? "dark";
  return (
    <Box flexDirection="column">
      <Text bold>{fg("accent", "Chọn chủ đề")}</Text>
      <Text>{fg("muted", "Hiện tại: ")}{fg("text", String(current))}</Text>
      {themes.map((t) => (
        <Text key={t}>
          {t === current ? fg("success", "✓ ") : fg("dim", "  ")}
          {fg("text", t)}
        </Text>
      ))}
    </Box>
  );
};

const renderModalBody = (modal: ModalProps["modal"]): React.ReactNode => {
  switch (modal.type) {
    case "help":
      return <HelpBody />;
    case "thinking":
      return <ThinkingBody props={modal.props} />;
    case "login":
      return <LoginBody />;
    case "confirmation":
      return <ConfirmBody props={modal.props} />;
    case "settings":
      return <SettingsBody props={modal.props} />;
    case "session-selector":
      return <SessionListBody props={modal.props} />;
    case "model-selector":
      return <ModelListBody props={modal.props} />;
    case "theme-selector":
      return <ThemeListBody props={modal.props} />;
    default:
      return <Text>{fg("text", `Hộp thoại: ${modal.type}`)}</Text>;
  }
};

export const Modal: React.FC<ModalProps> = ({ modal }) => {
  if (modal.type === "none") return null;

  return (
    <Box
      flexDirection="column"
      marginTop={2}
      paddingX={2}
      paddingY={1}
      borderStyle="round"
      borderColor="magenta"
    >
      <DynamicBorder />
      <Box paddingY={1} flexDirection="column">
        {renderModalBody(modal)}
      </Box>
      <Text>{fg("dim", "Ctrl+C hoặc /help để đóng")}</Text>
      <DynamicBorder />
    </Box>
  );
};
