/**
 * Provider implementations
 *
 * Currently supports:
 * - openai-compatible (OpenAI, Anthropic, Google, Groq, Cerebras, xAI, Mistral, HuggingFace, ZAI, OpenCode, NVIDIA NIM, etc.)
 *
 * Future: Add native providers (bedrock, vertex, etc.)
 */

export { stream, complete } from './openai-compatible';
