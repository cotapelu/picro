/**
 * Package Manager CLI - handle install/remove/update/list commands.
 * Called from main.ts when args start with these commands.
 */
export type PackageCommand = "install" | "remove" | "uninstall" | "update" | "list";
/**
 * Parse command line arguments for package commands.
 * Returns undefined if not a package command.
 */
export declare function parsePackageCommand(args: string[]): {
    command: PackageCommand;
    source?: string;
    local: boolean;
    help: boolean;
} | undefined;
/**
 * Handle package commands. Returns true if command was handled.
 */
export declare function handleConfigCommand(args: string[]): Promise<boolean>;
//# sourceMappingURL=package-manager-cli.d.ts.map