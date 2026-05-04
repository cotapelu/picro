import OpenAI from 'openai';
import type { Model, Context, StreamOptions, Message, Tool, Usage, TextContent, ThinkingContent, ToolCall } from '../types';
import { parseStreamingJson } from '../utils/json-parse';
import { sanitizeSurrogates } from '../utils/sanitize-unicode';
import { AssistantMessageEventStream } from '../event-stream';
import { getApiKey } from '../env-api-keys';
import { truncateContext } from '../overflow';
import { transformMessages } from '../transform-messages';
import { detectCompat, mergeCompat, CompatSettings } from '../compat-detection';
import { apiRegistry } from '../api-registry';
import { calculateCost } from '../models';

interface OpenAICompatOptions extends StreamOptions {
  toolChoice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
}

function resolveCompat(model: Model): Required<CompatSettings> {
  const detected = detectCompat(model.provider, model.baseUrl, model.id);
  return model.compat ? mergeCompat(detected, model.compat as Partial<CompatSettings>) : detected;
}

function getClient(model: Model, apiKey: string, headers?: Record<string, string>): OpenAI {
  return apiRegistry.getOrCreate(model, apiKey, headers);
}

function buildParams(
  model: Model,
  context: Context,
  options: OpenAICompatOptions,
  compat: Required<CompatSettings>
): any {
  const reservedTokens = options.maxTokens || Math.min(model.maxTokens, 4096);
  const adjustedCtx = truncateContext(context, model.contextWindow, reservedTokens);

  let messages = transformMessages(adjustedCtx.messages);
  messages = messages.map(msg => {
    if (msg.role !== 'assistant') return msg;
    const asst = msg as any;
    const newContent = asst.content.map((block: any) => {
      if (block.type === 'thinking' && compat.requiresThinkingAsText) {
        return { type: 'text', text: block.thinking };
      }
      if (block.type === 'toolCall' && block.id.includes('|')) {
        const cleanId = block.id.split('|')[0].replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
        return { ...block, id: cleanId };
      }
      return block;
    });
    return { ...asst, content: newContent };
  });

  const params: any = { model: model.id, messages: [], stream: true };

  if (adjustedCtx.systemPrompt) {
    const role = model.reasoning && compat.supportsDeveloperRole ? 'developer' : 'system';
    params.messages.push({ role, content: sanitizeSurrogates(adjustedCtx.systemPrompt) });
  }

  let lastRole: string | null = null;
  for (const msg of messages) {
    if (compat.insertAssistantBetweenToolAndUser && lastRole === 'tool' && msg.role === 'user') {
      params.messages.push({ role: 'assistant', content: 'Processed tool results.' });
    }

    if (msg.role === 'user') {
      const blocks = typeof msg.content === 'string'
        ? [{ type: 'text', text: sanitizeSurrogates(msg.content) }]
        : msg.content.map((b: any) => {
            if (b.type === 'text') return { type: 'text', text: sanitizeSurrogates(b.text) };
            if (b.type === 'image' && model.input.includes('image')) {
              return { type: 'image_url', image_url: { url: `data:${b.mimeType};base64,${b.data}` } };
            }
            return null;
          }).filter(Boolean);

      if (blocks.length > 0) {
        params.messages.push({ role: 'user', content: blocks });
        lastRole = 'user';
      }
    } else if (msg.role === 'assistant') {
      const asst = msg as any;
      const asstMsg: any = { role: 'assistant' };

      const textBlocks = asst.content.filter((b: any) => b.type === 'text');
      if (textBlocks.length > 0) asstMsg.content = textBlocks.map((b: any) => sanitizeSurrogates(b.text)).join('');

      const thinkingBlocks = asst.content.filter((b: any) => b.type === 'thinking');
      if (thinkingBlocks.length > 0 && compat.requiresThinkingAsText) {
        const text = thinkingBlocks.map((b: any) => b.thinking).join('\n');
        asstMsg.content = asstMsg.content
          ? [{ type: 'text', text }, { type: 'text', text: asstMsg.content }]
          : [{ type: 'text', text }];
      }

      const toolCalls = asst.content.filter((b: any) => b.type === 'toolCall');
      if (toolCalls.length > 0) {
        asstMsg.tool_calls = toolCalls.map((tc: any) => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
        }));
      }

      if (asstMsg.content || asstMsg.tool_calls) {
        params.messages.push(asstMsg);
        lastRole = 'assistant';
      }
    } else if (msg.role === 'toolResult') {
      const toolMsg: any = {
        role: 'tool',
        content: sanitizeSurrogates(
          msg.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n') || '(see image)'
        ),
        tool_call_id: msg.toolCallId,
      };
      if (compat.needToolResultName && msg.toolName) toolMsg.name = msg.toolName;
      params.messages.push(toolMsg);
      lastRole = 'tool';
    }
  }

  // OpenRouter cache control
  if (model.provider === 'openrouter' && model.id.startsWith('anthropic/')) {
    for (let i = params.messages.length - 1; i >= 0; i--) {
      const msg = params.messages[i];
      if (msg.role === 'user' || msg.role === 'assistant') {
        if (typeof msg.content === 'string') {
          msg.content = [{ type: 'text', text: msg.content, cache_control: { type: 'ephemeral' } }];
        } else if (Array.isArray(msg.content)) {
          const textPart = msg.content.find((p: any) => p.type === 'text');
          if (textPart) textPart.cache_control = { type: 'ephemeral' };
        }
        break;
      }
    }
  }

  if (adjustedCtx.tools?.length) {
    params.tools = adjustedCtx.tools.map((tool: any) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        ...(compat.strictModeAvailable ? { strict: false } : {}),
      },
    }));
  } else if (messages.some((msg: any) =>
    msg.role === 'toolResult' ||
    (msg.role === 'assistant' && msg.content.some((b: any) => b.type === 'toolCall'))
  )) {
    params.tools = [];
  }

  if (options.toolChoice) params.tool_choice = options.toolChoice;
  if (options.temperature !== undefined) params.temperature = options.temperature;

  if (model.reasoning && options.reasoningEffort && compat.supportsReasoningEffort) {
    if (compat.thinkingFormat === 'zai' || compat.thinkingFormat === 'qwen') {
      params.enable_thinking = true;
    } else if (compat.thinkingFormat === 'openrouter') {
      params.reasoning = { effort: options.reasoningEffort };
    } else {
      params.reasoning_effort = options.reasoningEffort;
    }
  }

  if (compat.reportUsageInStream) params.stream_options = { include_usage: true };
  if (compat.supportsStore) params.store = false;

  return params;
}

function mapFinishReason(reason: string | null | undefined): { reason: 'stop' | 'length' | 'toolUse' | 'error' | 'aborted'; message?: string } {
  if (!reason) return { reason: 'stop' };
  switch (reason) {
    case 'stop': case 'end': return { reason: 'stop' };
    case 'length': return { reason: 'length' };
    case 'tool_calls': case 'function_call': return { reason: 'toolUse' };
    case 'content_filter': return { reason: 'error', message: 'Content filtered by provider' };
    default: return { reason: 'error', message: `Provider finish reason: ${reason}` };
  }
}

function calcUsage(rawUsage: any, model: Model): Usage {
  const inputTokens = rawUsage.prompt_tokens || 0;
  const outputTokens = rawUsage.completion_tokens || 0;
  const cacheDetails = rawUsage.prompt_tokens_details || {};
  const completionDetails = rawUsage.completion_tokens_details || {};

  const cacheWrite = cacheDetails.cache_write_tokens || 0;
  const cacheReadRaw = cacheDetails.cached_tokens || 0;
  const cacheRead = cacheWrite > 0 ? Math.max(0, cacheReadRaw - cacheWrite) : cacheReadRaw;
  const reasoningTokens = completionDetails.reasoning_tokens || 0;

  const input = Math.max(0, inputTokens - cacheRead - cacheWrite);
  const output = outputTokens + reasoningTokens;
  const total = input + output + cacheRead + cacheWrite;

  const usage: Usage = {
    input, output, cacheRead, cacheWrite, totalTokens: total,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  };
  calculateCost(model, usage);
  return usage;
}

export async function stream(
  model: Model,
  context: Context,
  options: OpenAICompatOptions = {}
): Promise<AssistantMessageEventStream> {
  const eventStream = new AssistantMessageEventStream();
  const compat = resolveCompat(model);

  (async () => {
    const output: any = {
      role: 'assistant', content: [], api: model.api, provider: model.provider, model: model.id,
      usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
      stopReason: 'stop' as const, timestamp: Date.now(),
    };

    try {
      const apiKey = options.apiKey || getApiKey(model.provider) || '';
      if (!apiKey) throw new Error(`No API key for provider: ${model.provider}`);

      let params = buildParams(model, context, options, compat);
      const modified = await options.onPayload?.(params, model);
      if (modified !== undefined) params = modified;

      const client = getClient(model, apiKey, options.headers);
      const responseStream = await client.chat.completions.create(params, { signal: options.signal }) as any;

      eventStream.push({ type: 'start', partial: output });

      let currentBlock: any = null;
      const blocks = output.content;
      let chunkUsage: any = null;

      for await (const chunk of responseStream) {
        if (!chunk) continue;

        output.responseId ||= chunk.id;
        if (chunk.usage) chunkUsage = chunk.usage;
        const choice = Array.isArray(chunk.choices) ? chunk.choices[0] : null;
        if (choice?.usage) chunkUsage = choice.usage;
        if (!choice) continue;

        if (choice.finish_reason) {
          const res = mapFinishReason(choice.finish_reason);
          output.stopReason = res.reason;
          if (res.message) output.errorMessage = res.message;
        }

        const delta = choice.delta;
        if (!delta) continue;

        // Text delta
        if (delta.content) {
          if (!currentBlock || currentBlock.type !== 'text') {
            if (currentBlock) {
              const endType = currentBlock.type === 'text' ? 'text_end' : 'thinking_end';
              eventStream.push({ type: endType, contentIndex: blocks.length - 1, content: currentBlock.text || currentBlock.thinking, partial: output });
            }
            currentBlock = { type: 'text', text: '' };
            blocks.push(currentBlock);
            eventStream.push({ type: 'text_start', contentIndex: blocks.length - 1, partial: output });
          }
          currentBlock.text += delta.content;
          eventStream.push({ type: 'text_delta', contentIndex: blocks.length - 1, delta: delta.content, partial: output });
        }

        // Reasoning delta
        const reasoningKey = ['reasoning_content', 'reasoning', 'reasoning_text'].find(k => (delta as any)[k]);
        if (reasoningKey) {
          if (!currentBlock || currentBlock.type !== 'thinking') {
            if (currentBlock) {
              const endType = currentBlock.type === 'text' ? 'text_end' : 'thinking_end';
              eventStream.push({ type: endType, contentIndex: blocks.length - 1, content: currentBlock.text || currentBlock.thinking, partial: output });
            }
            currentBlock = { type: 'thinking', thinking: '', source: reasoningKey };
            blocks.push(currentBlock);
            eventStream.push({ type: 'thinking_start', contentIndex: blocks.length - 1, partial: output });
          }
          currentBlock.thinking += (delta as any)[reasoningKey];
          eventStream.push({ type: 'thinking_delta', contentIndex: blocks.length - 1, delta: (delta as any)[reasoningKey], partial: output });
        }

        // Tool call delta
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.id) {
              if (currentBlock) {
                const endType = currentBlock.type === 'text' ? 'text_end' : 'thinking_end';
                eventStream.push({ type: endType, contentIndex: blocks.length - 1, content: currentBlock.text || currentBlock.thinking, partial: output });
              }
              currentBlock = { type: 'toolCall', id: tc.id, name: tc.function?.name || '', arguments: {}, partialArgs: '' };
              blocks.push(currentBlock);
              eventStream.push({ type: 'toolcall_start', contentIndex: blocks.length - 1, partial: output });
            }
            if (currentBlock?.type === 'toolCall' && tc.function?.arguments) {
              currentBlock.partialArgs += tc.function.arguments;
              currentBlock.arguments = parseStreamingJson(currentBlock.partialArgs);
              eventStream.push({ type: 'toolcall_delta', contentIndex: blocks.length - 1, delta: tc.function.arguments, partial: output });
            }
          }
        }
      }

      // Finalize block
      if (currentBlock) {
        const endType = currentBlock.type === 'text' ? 'text_end' : currentBlock.type === 'thinking' ? 'thinking_end' : 'toolcall_end';
        const content = currentBlock.text || currentBlock.thinking;
        eventStream.push({ type: endType, contentIndex: blocks.length - 1, content, toolCall: currentBlock.type === 'toolCall' ? currentBlock : undefined, partial: output });
      }

      if (chunkUsage) output.usage = calcUsage(chunkUsage, model);
      if (output.stopReason === 'aborted') throw new Error('Request aborted');
      if (output.stopReason === 'error') throw new Error(output.errorMessage || 'Provider error');

      eventStream.push({ type: 'done', reason: output.stopReason, message: output });
      eventStream.end();
    } catch (error: any) {
      output.stopReason = options.signal?.aborted ? 'aborted' : 'error';
      const msg = error instanceof Error ? error.message : String(error);
      const raw = (error as any)?.error?.metadata?.raw;
      output.errorMessage = raw ? `${msg}\n${raw}` : msg;
      eventStream.push({ type: 'error', reason: output.stopReason, error: output });
      eventStream.end();
    }
  })();

  return eventStream;
}

export async function complete(
  model: Model,
  context: Context,
  options: OpenAICompatOptions = {}
): Promise<any> {
  const resultStream = await stream(model, context, options);
  return resultStream.result();
}
