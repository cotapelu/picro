/** @jsxImportSource react */
import React from 'react';
interface HeaderProps {
    title: string;
    status: string;
    thinkingLevel: string;
    model: string;
    theme?: string;
    showArmin?: boolean;
    resourceCounts?: {
        extensions: number;
        skills: number;
        prompts: number;
        themes: number;
    };
}
export declare const Header: React.FC<HeaderProps>;
export {};
//# sourceMappingURL=Header.d.ts.map