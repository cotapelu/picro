// SettingsSubmenu - menu con cho cài đặt
// Bắt chước nguyên tắc pi-mono components/settings-submenu.ts:
//   - SelectSubmenu: tiêu đề + mô tả + danh sách chọn, có lọc gõ-tìm
//   - SteppedSubmenu: nhiều bước, mỗi bước phụ thuộc kết quả bước trước
//   - Esc quay lại bước trước; hết bước cuối thì gọi onComplete
// Port sang Ink TSX, khong copy code truc iep.

import React, { useMemo, useState } from "react";
import { Box, Text } from "ink";
import { theme, fg, bg } from "../theme/index.js";
import { SelectList, type SelectItem } from "./SelectList.js";
import { DynamicBorder } from "./DynamicBorder.js";
import { KeyHintText } from "./KeyHintText.jsx";
import { TextInput } from "./TextInput.jsx";

export interface SelectSubmenuProps {
  title: string;
  description?: string;
  options: SelectItem[];
  currentValue?: string;
  onSelect: (value: string) => void;
  onCancel: () => void;
  onHighlight?: (value: string) => void;
  /** Cho phép gõ để lọc mờ. */
  searchable?: boolean;
  width?: number;
}

export const SelectSubmenu: React.FC<SelectSubmenuProps> = ({
  title,
  description,
  options,
  currentValue,
  onSelect,
  onCancel,
  onHighlight,
  searchable = false,
  width = 80,
}) => {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((item) =>
      `${item.label} ${item.description ?? ""}`.toLowerCase().includes(q),
    );
  }, [options, query]);

  return (
    <Box flexDirection="column">
      <Text bold>{fg("accent", title)}</Text>
      {description ? (
        <>
          <Text> </Text>
          <Text>{fg("muted", description)}</Text>
        </>
      ) : null}
      {searchable ? (
        <>
          <Text> </Text>
          <TextInput value={query} placeholder="Gõ để lọc…" onChange={setQuery} />
        </>
      ) : null}
      <Text> </Text>
      <SelectList
        items={filtered}
        initialValue={currentValue}
        onSelect={(item) => onSelect(item.value)}
        onCancel={onCancel}
        onHighlight={(item) => onHighlight?.(item?.value)}
        width={width}
      />
      <Text> </Text>
      <Text>
        {fg("dim", "  Enter để chọn · Esc để quay lại")}
      </Text>
    </Box>
  );
};

export interface SteppedSubmenuStep {
  /** Khóa lưu giá trị bước này trong context. */
  key: string;
  title: string | ((context: Record<string, string>) => string);
  description: string | ((context: Record<string, string>) => string);
  options: (context: Record<string, string>) => SelectItem[];
  preselect?: (context: Record<string, string>) => string | undefined;
  searchable?: boolean;
}

export interface SteppedSubmenuProps {
  steps: SteppedSubmenuStep[];
  onComplete: (context: Record<string, string>) => void;
  onCancel: () => void;
  initialContext?: Record<string, string>;
  /** Xong bước cuối thì quay lại bước 0 thay vì đóng. */
  loop?: boolean;
  width?: number;
}

export const SteppedSubmenu: React.FC<SteppedSubmenuProps> = ({
  steps,
  onComplete,
  onCancel,
  initialContext,
  loop = false,
  width = 80,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [context, setContext] = useState<Record<string, string>>({ ...(initialContext ?? {}) });

  const step = steps[stepIndex];
  if (!step) {
    // Nothing to choose: report the (empty) context instead of throwing on
    // step.title below.
    onComplete({ ...context });
    return null;
  }
  const title = typeof step.title === "function" ? step.title(context) : step.title;
  const description =
    typeof step.description === "function" ? step.description(context) : step.description;
  const stepLabel = steps.length > 1 ? `Bước ${stepIndex + 1}/${steps.length} · ` : "";
  const options = step.options(context);
  const preselect = step.preselect?.(context);

  const advance = (value: string) => {
    const nextContext = { ...context, [step.key]: value };
    setContext(nextContext);
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
      return;
    }
    onComplete({ ...nextContext });
    if (loop) {
      setContext({});
      setStepIndex(0);
    } else {
      onCancel();
    }
  };

  const back = () => {
    if (stepIndex > 0) {
      const next = { ...context };
      delete next[step.key];
      setContext(next);
      setStepIndex(stepIndex - 1);
    } else {
      onCancel();
    }
  };

  return (
    <Box flexDirection="column">
      <DynamicBorder />
      <SelectSubmenu
        title={title}
        description={`${stepLabel}${description}`}
        options={options}
        currentValue={preselect}
        onSelect={advance}
        onCancel={back}
        searchable={step.searchable}
        width={width}
      />
      <DynamicBorder />
    </Box>
  );
};
