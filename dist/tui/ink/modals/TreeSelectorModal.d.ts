/** @jsxImportSource react */
import React from 'react';
import type { AgentSessionRuntimeInterface } from '../../../runtime';
interface TreeSelectorModalProps {
    runtime: AgentSessionRuntimeInterface;
    onClose: () => void;
    onSelect?: (branchId: string) => Promise<void> | void;
}
export declare const TreeSelectorModal: React.FC<TreeSelectorModalProps>;
export {};
//# sourceMappingURL=TreeSelectorModal.d.ts.map