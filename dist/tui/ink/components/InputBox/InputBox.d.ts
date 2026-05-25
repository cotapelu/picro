/** @jsxImportSource react */
import React from 'react';
interface InputBoxProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    multiline?: boolean;
    autoFocus?: boolean;
    onSlashCommand?: (prefix: string) => void;
    onTab?: () => void;
    cwd?: string;
    onPathComplete?: (partial: string) => Promise<string[]>;
    onExternalEdit?: (text: string) => Promise<string> | string;
    onAutocomplete?: (filter: string) => Promise<string[]>;
}
export declare const InputBox: React.FC<InputBoxProps>;
export {};
//# sourceMappingURL=InputBox.d.ts.map