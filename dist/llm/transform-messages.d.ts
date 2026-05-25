import type { Message } from './types.js';
/**
 * Biến đổi lịch sử tin nhắn để tương thích provider.
 */
export declare function transformMessages(messages: Message[]): Message[];
/**
 * Loại bỏ các assistant message rỗng khỏi lịch sử.
 */
export declare function transformAssistantMessages(messages: Message[]): Message[];
//# sourceMappingURL=transform-messages.d.ts.map