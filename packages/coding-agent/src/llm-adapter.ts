/**
 * LLM Adapter - Converts @picro/llm Model to LLMInstance
 * 
 * Implements the Adapter pattern to bridge @picro/llm and @picro/agent.
 * This file lives in the application layer (coding-agent) to keep agent core LLM-agnostic.
 */

import type { LLMResponse } from '@picro/agent';
import { stream, type Model, type Context } from '@picro/llm';

export interface LLMInstance {
  getModel(): string;
  chatWithTools(prompt: string, tools: any[], options?: LLMCallOptions): Promise<LLMResponse>;
  chat(prompt: string, options?: LLMCallOptions): Promise<string>;
}

export interface LLMCallOptions {
  [key: string]: any;
}

/**
 * Create an LLMInstance from a Model
 */
export function createLLMInstance(model: Model): LLMInstance {
  return {
    getModel(): string {
      return model.id;
    },
    
    async chatWithTools(prompt: string, tools: any[], options?: LLMCallOptions): Promise<LLMResponse> {
      const context: Context = { 
        messages: [{ 
          role: 'user' as const, 
          content: prompt, 
          timestamp: Date.now()
        }],
        tools: tools
      };
      
      const events = await stream(model, context, options);
      
      // Collect the response
      let result = '';
      let toolCalls: any[] = [];
      let currentToolCall: any = null;
      let stopReason: any = 'stop';
      let usage = { input: 0, output: 0, totalTokens: 0, cost: { input: 0, output: 0, total: 0 } };
      
      for await (const event of events) {
        switch (event.type) {
          case 'text_delta':
          case 'text_start':
            result += event.delta || event.content || '';
            break;
            
          case 'toolcall_start':
            // Bắt đầu một tool call mới
            if (event.toolCall) {
              const { id: rawId, name, arguments: args } = event.toolCall;
              const id = rawId || `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              currentToolCall = { id, name, arguments: { ...args } };
            } else {
              currentToolCall = null;
            }
            break;
            
          case 'toolcall_delta':
            // Cập nhật tool call đang dần hoàn thiện (thường là arguments)
            if (currentToolCall && event.toolCall) {
              // Merge arguments nếu có partialArgs
              if (event.toolCall.arguments) {
                Object.assign(currentToolCall.arguments, event.toolCall.arguments);
              }
              if (event.toolCall.partialArgs) {
                // Xử lý partial JSON nếu cần
                try {
                  const parsed = JSON.parse(event.toolCall.partialArgs);
                  Object.assign(currentToolCall.arguments, parsed);
                } catch (e) {
                  // Partial JSON chưa hoàn chỉnh, bỏ qua
                }
              }
            }
            break;
            
          case 'toolcall_end':
            // Tool call hoàn tất, thêm vào danh sách
            if (currentToolCall) {
              toolCalls.push(currentToolCall);
              currentToolCall = null;
            }
            break;
            
          case 'done':
            if (event.message) {
              stopReason = event.message.stopReason || 'stop';
              // Lấy usage từ message
              if (event.message.usage) {
                usage = {
                  input: event.message.usage.input || 0,
                  output: event.message.usage.output || 0,
                  totalTokens: event.message.usage.totalTokens || 0,
                  cost: {
                    input: event.message.usage.cost?.input || 0,
                    output: event.message.usage.cost?.output || 0,
                    total: event.message.usage.cost?.total || 0
                  }
                };
              }
            }
            break;
        }
      }
      
      return {
        content: result,
        toolCalls,
        stopReason: stopReason,
        usage: usage
      };
    },
    
    async chat(prompt: string, options?: LLMCallOptions): Promise<string> {
      const context: Context = { 
        messages: [{ 
          role: 'user' as const, 
          content: prompt, 
          timestamp: Date.now()
        }] 
      };
      
      const events = await stream(model, context, options);
      
      let result = '';
      for await (const event of events) {
        if (event.type === 'text_delta' || event.type === 'text_start') {
          result += event.delta || event.content || '';
        }
      }
      return result;
    },
  };
}