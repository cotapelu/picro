// Main entry point exports

export interface CliArgs {
  model?: string;
  provider?: string;
  session?: string;
  interactive?: boolean;
  debug?: boolean;
  system?: string;
  output?: string;
  compact?: boolean;
  help?: boolean;
}

export type CliParseFn = (args: string[]) => CliArgs;

export function parseCliArgs(args: string[]): CliArgs {
  const result: CliArgs = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];
    
    switch (arg) {
      case '-m':
      case '--model':
        result.model = next;
        i++;
        break;
      case '-p':
      case '--provider':
        result.provider = next;
        i++;
        break;
      case '-s':
      case '--session':
        result.session = next;
        i++;
        break;
      case '-i':
      case '--interactive':
        result.interactive = true;
        break;
      case '-d':
      case '--debug':
        result.debug = true;
        break;
      case '--system':
        result.system = next;
        i++;
        break;
      case '-o':
      case '--output':
        result.output = next;
        i++;
        break;
      case '--compact':
        result.compact = true;
        break;
      case '-h':
      case '--help':
        result.help = true;
        break;
      default:
        if (!arg.startsWith('-')) {
          result.model = arg;
        }
    }
  }
  
  return result;
}

export function printHelp(): void {
  console.log(`
pi - AI Coding Assistant

Usage: pi [options] [prompt]

Options:
  -m, --model <model>       Model to use (provider/model)
  -p, --provider <provider> Provider to use
  -s, --session <name>     Session name to use
  -i, --interactive        Start interactive mode (TUI)
  -d, --debug              Enable debug mode
  --system <prompt>         System prompt
  -o, --output <file>       Output to file
  --compact                Compact output
  -h, --help               Show this help

Examples:
  pi "Write a hello world program"
  pi -i
  pi -m anthropic/claude-opus-4-6 "Explain this code"
`);
}