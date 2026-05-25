/** @jsxImportSource react */
import React from 'react';
interface Command {
    id: string;
    label: string;
    description?: string;
    shortcut?: string;
}
interface CommandPaletteProps {
    commands: Command[];
    onSelect: (commandId: string) => void;
    onClose: () => void;
    initialFilter?: string;
}
export declare const CommandPalette: React.FC<CommandPaletteProps>;
export {};
//# sourceMappingURL=CommandPalette.d.ts.map