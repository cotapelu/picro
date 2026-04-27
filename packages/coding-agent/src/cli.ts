// Main entry point exports (all TUI-based)

import type { UIElement, RenderContext } from '@picro/tui';
import { TerminalUI, ProcessTerminal, SelectList, SelectItem, Input, Markdown, Text } from '@picro/tui';
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
  private terminal: ProcessTerminal;
  private agent: Agent | null = null;
  private provider: string = '';
  private modelId: string = '';
  private outputLines: string[] = []; // accumulated output
  private history: string[] = [];

  constructor() {
    this.terminal = new ProcessTerminal();
    this.tui = new TerminalUI(this.terminal, true);

    // Build UI structure
    this.setupUI();

    // Handle key globally (e.g., Ctrl+C to exit)
    this.tui.addKeyHandler((key): KeyHandlerResult => {
      if (key.raw === '\x03') { // Ctrl+C
        this.tui.stop();
        process.exit(0);
        return { consume: true };
      }
      if (key.name === 'escape') {
        // Escape anywhere returns to prompt
        this.focusPrompt();
        return { consume: true };
      }
      return {};
    });
  }

  /** Setup UI elements */
  private setupUI(): void {
    // Title bar
    const title = new Text('🤖 picro - AI Coding Assistant');

    // Output area (markdown)
    const output = new Markdown('');

    // Prompt input
    const promptInput = new Input({
      placeholder: 'Ask anything... (Ctrl+C to exit)',
      onChange: () => this.tui.requestRender(),
      onSubmit: (val) => this.handleSubmit(val, output),
      onCancel: () => this.handleCancel(),
    });

    // Build root layout - TerminalUI is an ElementContainer, so we push to children
    this.tui.children.push(title);
    this.tui.children.push(output);
    this.tui.children.push(promptInput);

    // Store references
    (this as any)._outputEl = output;
    (this as any)._promptEl = promptInput;
  }

  /** Start the application */
  async start(): Promise<void> {
    // Start TUI event loop FIRST (render screen, enable raw mode)
    this.tui.start();

    // Then show provider/model selection
    await this.selectProviderAndModel();

    // Initialize agent
    this.agent = new Agent(toAIModel(this.modelId, this.provider), []);
    console.log();
  }

  /** Select provider and model using SelectList */
  private async selectProviderAndModel(): Promise<void> {
    // Step 1: Select provider
    const providers = getProviders();
    const providerItems = providers.map(p => ({ value: p, label: p }));
    this.provider = await this.showSelect('Select AI Provider:', providerItems);

    // Step 2: Select model
    const models = buildModelItems(this.provider);
    this.modelId = await this.showSelect(`Select Model for ${this.provider}:`, models);
  }

  /** Show a SelectList and return selected value */
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

      // Show as modal panel
      const panel = this.tui.showPanel(select, {
        anchor: 'center',
        width: Math.min(60, cols - 4),
        height: Math.min(20, rows - 4),
      });
    });
  }

  /** Handle prompt submission */
  private async handleSubmit(prompt: string, output: Markdown): Promise<void> {
    if (!prompt.trim()) return;

    // Add to history
    this.history.push(prompt);

    // Append user prompt to output
    this.appendOutput(`**User:** ${prompt}\n\n`);

    // Show loading
    const loadingId = this.appendOutput('⏳ Thinking...');

    try {
      const result: AgentRunResult = await this.agent!.run(prompt);
      const response = result.finalAnswer || '(no response)';

      // Replace loading with response
      this.replaceOutput(loadingId, `**Assistant:** ${response}\n`);
      this.appendOutput('');
    } catch (error) {
      const err = error as Error;
      this.replaceOutput(loadingId, `❌ **Error:** ${err.message}`);
    }

    // Clear input
    (this as any)._promptEl.setValue?.('');
    this.tui.requestRender();
  }

  /** Handle cancel/escape */
  private handleCancel(): void {
    // Could show confirm dialog
    process.exit(0);
  }

  /** Focus back to prompt */
  private focusPrompt(): void {
    const prompt = (this as any)._promptEl;
    if (prompt) {
      this.tui.setFocus(prompt);
    }
  }

  /** Append line to output */
  private appendOutput(text: string): number {
    const id = this.outputLines.length;
    this.outputLines.push(text);
    this.refreshOutput();
    return id;
  }

  /** Replace output line at index */
  private replaceOutput(index: number, text: string): void {
    if (index >= 0 && index < this.outputLines.length) {
      this.outputLines[index] = text;
      this.refreshOutput();
    }
  }

  /** Refresh the Markdown output element */
  private refreshOutput(): void {
    const output = (this as any)._outputEl as Markdown;
    if (output) {
      output.setContent(this.outputLines.join('\n'));
      this.tui.requestRender();
    }
  }

  /** Update prompt marker position */
  private updatePromptMarker(): void {
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
