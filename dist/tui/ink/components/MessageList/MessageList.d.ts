/** @jsxImportSource react */
import React from 'react';
import type { Message } from '../../types';
export interface MessageListRef {
    scrollToBottom: () => void;
}
interface MessageListProps {
    messages: Message[];
    theme?: any;
    hideThinkingBlock?: boolean;
}
export declare const MessageList: React.ForwardRefExoticComponent<MessageListProps & React.RefAttributes<MessageListRef>>;
export {};
//# sourceMappingURL=MessageList.d.ts.map