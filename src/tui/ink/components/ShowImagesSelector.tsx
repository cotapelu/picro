// ShowImagesSelector - chọn có hiển thị ảnh inline không
// Bắt chước nguyên tắc pi-mono components/show-images-selector.ts:
//   - Hai phương án Có/Không kèm mô tả
//   - Viền động bao quanh, tiền chọn theo giá trị hiện tại
// Port sang Ink TSX, khong copy code truc tiep.

import React from "react";
import { Box, Text } from "ink";
import { theme } from "../theme/index.js";
import { DynamicBorder } from "./DynamicBorder.js";
import { SelectList } from "./SelectList.js";

export interface ShowImagesSelectorProps {
  currentValue: boolean;
  onSelect: (show: boolean) => void;
  onCancel: () => void;
  width?: number;
}

export const ShowImagesSelector: React.FC<ShowImagesSelectorProps> = ({
  currentValue,
  onSelect,
  onCancel,
  width = 80,
}) => {
  const items = [
    { value: "yes", label: "Có", description: "Hiện ảnh trực tiếp trong terminal" },
    { value: "no", label: "Không", description: "Chỉ hiện chữ thay thế" },
  ];

  return (
    <Box flexDirection="column" width={width}>
      <DynamicBorder />
      <SelectList
        items={items}
        initialValue={currentValue ? "yes" : "no"}
        onSelect={(item) => onSelect(item.value === "yes")}
        onCancel={onCancel}
        width={width}
      />
      <DynamicBorder />
    </Box>
  );
};
