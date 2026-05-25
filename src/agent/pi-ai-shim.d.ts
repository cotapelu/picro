/**
 * Shim for pi-ai types and utilities.
 * This provides minimal implementations for runtime compatibility.
 */
export interface Usage {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
    cost: {
        input: number;
        output: number;
        cacheRead: number;
        cacheWrite: number;
        total: number;
    };
}
export declare function isContextOverflow(message: any, contextWindow: number): boolean;
//# sourceMappingURL=pi-ai-shim.d.ts.map