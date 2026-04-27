// Main entry point - Minimal TUI Chat Interface

import { TerminalUI, ProcessTerminal, SelectList, SelectItem, Input, Text, UserMessage, AssistantMessage, ToolMessage, ElementContainer } from '@picro/tui';
import { Agent, getModel, getProviders, getModels, type AgentRunResult } from '@picro/agent';
import chalk from 'chalk';

type KeyHandlerResult = { consume?: boolean; data?: string } | undefined;

/** Convert llm Model to agent AIModel */
export function toAIModel(modelId: string, provider: string) {
  const model = getModel(provider, modelId);
  if (!model) {
    throw new Error(`Model not found: ${provider}/${modelId}`);
  }
  return {
    id: model.id,
    name: model.name || model.id,
    provider: model.provider,
    contextWindow: model.contextWindow || 128000,
    maxTokens: model.maxTokens || 4096,
    inputCost: model.cost?.input || 0,
    outputCost: model.cost?.output || 0,
    api: 'openai',
    reasoning: false,
  };
}

/** Build SelectItem from model */
function buildModelItems(provider: string): SelectItem[] {
  const models = getModels(provider);
  return models.map(m => ({
    value: m.id,
    label: m.name || m.id,
    description: `Context: ${((m.contextWindow || 0) / 1000).toFixed(0)}K tokens`,
  }));
}

/** Main TUI Application */
export class PiCli {
  private tui: TerminalUI;
  private agent: Agent | null = null;
  private provider: string = '';
  private modelId: string = '';
  private chatContainer: ElementContainer;
  private input!: Input;
  private footer!: Text;

  constructor() {
    const terminal = new ProcessTerminal();
    this.tui = new TerminalUI(terminal, true);
    this.chatContainer = new ElementContainer();

    this.setupUI();

    this.tui.addKeyHandler((key): KeyHandlerResult => {
      if (key.raw === '\x03') {
        this.tui.stop();
        process.exit(0);
        return { consume: true };
      }
      if (key.name === 'escape') {
        this.focusInput();
        return { consume: true };
      }
      return {};
    });
  }

  private setupUI(): void {
    // Title
    const title = new Text('🤖 picro - AI Coding Assistant');
    this.tui.children.push(title);

    // Chat container (scrollable region)
    this.tui.children.push(this.chatContainer);

    // Input
    this.input = new Input({
      placeholder: 'Ask anything... (Ctrl+C to exit)',
      onChange: () => this.tui.requestRender(),
      onSubmit: (val) => this.handleSubmit(val),
      onCancel: () => this.handleCancel(),
    });
    this.tui.children.push(this.input);

    // Footer
    this.footer = new Text('');
    this.tui.children.push(this.footer);
  }

  async start(): Promise<void> {
    this.tui.start();
    this.updateFooter('Selecting model...');

    await this.selectProviderAndModel();

    this.agent = new Agent(toAIModel(this.modelId, this.provider), []);
    this.updateFooter(`Ready: ${this.provider}/${this.modelId}`);
    console.log();
  }

  private async selectProviderAndModel(): Promise<void> {
    const providers = getProviders();
    const providerItems = providers.map(p => ({ value: p, label: p }));
    this.provider = await this.showSelect('Select AI Provider:', providerItems);

    const models = buildModelItems(this.provider);
    this.modelId = await this.showSelect(`Select Model for ${this.provider}:`, models);
  }

  private async showSelect(message: string, items: SelectItem[]): Promise<string> {
    const { cols, rows } = this.tui.getSize();

    return await new Promise<string>((resolve) => {
      const select = new SelectList(items, Math.min(15, rows - 8), {
        selectedPrefix: (text) => chalk.cyan(text),
        selectedText: (text) => chalk.bold(text),
        description: (text) => chalk.gray(text),
        scrollInfo: (text) => chalk.gray(text),
      }, (value) => {
        panel.close();
        resolve(value);
      }, () => {
        panel.close();
        process.exit(0);
      });

      const panel = this.tui.showPanel(select, {
        anchor: 'center',
        width: Math.min(60, cols - 4),
        height: Math.min(20, rows - 4),
      });
    });
  }

  private async handleSubmit(prompt: string): Promise<void> {
    if (!prompt.trim()) return;

    // User message
    const userMsg = new UserMessage({ text: prompt });
    this.chatContainer.append(userMsg);

    // Tool status (loading)
    const toolMsg = new ToolMessage({ toolName: 'agent', output: '⏳ Thinking...' });
    this.chatContainer.append(toolMsg);

    this.tui.requestRender();

    try {
      const result: AgentRunResult = await this.agent!.run(prompt);
      const response = result.finalAnswer || '(no response)';

      toolMsg.setResult('✅ Done', 0);

      const assistantMsg = new AssistantMessage({ content: response });
      this.chatContainer.append(assistantMsg);
    } catch (error) {
      const err = error as Error;
      toolMsg.setError(`❌ Error: ${err.message}`);
      const errorMsg = new AssistantMessage({ content: `**Error:** ${err.message}` });
      this.chatContainer.append(errorMsg);
    }

    this.input.setValue?.('');
    this.tui.requestRender();
  }

  private handleCancel(): void {
    process.exit(0);
  }

  private focusInput(): void {
    this.tui.setFocus(this.input);
  }

  private updateFooter(text: string): void {
    this.footer.setContent(text);
    this.tui.requestRender();
  }
}

/** Quick start */
async function main(): Promise<void> {
  const app = new PiCli();
  await app.start();
}

// Start immediately when run
try {
  main().catch(console.error);
} catch {
  // ignore
}
