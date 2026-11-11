// Toast - hiển thị thông báo tạm thời
import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  duration?: number;
  createdAt: number;
}

interface ToastProps {
  toasts: Toast[];
}

export const Toast: React.FC<ToastProps> = ({ toasts }) => {
  const [visibleToasts, setVisibleToasts] = useState<Toast[]>(toasts);

  useEffect(() => {
    const now = Date.now();
    setVisibleToasts(
      toasts.filter((t) => {
        const elapsed = now - t.createdAt;
        return elapsed < (t.duration || 3000);
      })
    );
  }, [toasts]);

  if (visibleToasts.length === 0) return null;

  return (
    <Box flexDirection="column" padding={1}>
      {visibleToasts.map((t) => (
        <Box
          key={t.id}
          marginBottom={1}
          padding={1}
          borderColor={t.type === 'error' ? 'red' : t.type === 'success' ? 'green' : 'yellow'}
          borderStyle="round"
        >
          <Text>{t.message}</Text>
        </Box>
      ))}
    </Box>
  );
};
