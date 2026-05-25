/** @jsxImportSource react */
import React from 'react';
import type { Message } from '../../types';
interface MessageItemProps {
    message: Message;
    theme?: any;
    onToolToggle?: (toolId: string) => void;
    expandedTools?: Set<string>;
    hideThinkingBlock?: boolean;
}
export declare const MessageItem: React.FC<MessageItemProps>;
export {};
//# sourceMappingURL=MessageItem.d.ts.map