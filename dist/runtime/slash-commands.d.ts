/**
 * Slash Commands - Built-in commands list
 *
 * Học từ legacy mà KHÔNG copy code:
 * - Built-in commands: settings, model, export, import, share, etc.
 */
export interface SlashCommandInfo {
    name: string;
    description: string;
}
export declare const BUILTIN_SLASH_COMMANDS: SlashCommandInfo[];
export declare function getSlashCommand(name: string): SlashCommandInfo | undefined;
export declare function listSlashCommands(): SlashCommandInfo[];
//# sourceMappingURL=slash-commands.d.ts.map