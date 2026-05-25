/**
 * Footer Data Provider
 *
 * Provides read-only data for the footer UI, such as:
 * - Git branch information
 * - Extension status indicators
 * - Session statistics
 * - Other dynamic status info
 */
/**
 * Git information for footer
 */
export interface GitInfo {
    /** Current branch name */
    branch: string;
    /** Whether there are uncommitted changes */
    dirty: boolean;
    /** Number of commits ahead of remote */
    ahead?: number;
    /** Number of commits behind remote */
    behind?: number;
}
/**
 * Extension status in footer
 */
export interface ExtensionStatus {
    /** Extension name */
    name: string;
    /** Whether extension is active */
    active: boolean;
    /** Optional status message */
    status?: string;
}
/**
 * Footer data snapshot
 */
export interface FooterData {
    /** Current git info (if in git repo) */
    git?: GitInfo;
    /** Active extensions */
    extensions: ExtensionStatus[];
    /** Session info */
    session?: {
        id: string;
        model: string;
        turns: number;
    };
    /** Custom key-value pairs */
    custom: Record<string, string>;
}
/**
 * Footer data provider interface
 */
export interface FooterDataProvider {
    /** Get current footer data */
    getData(): FooterData;
    /** Subscribe to updates */
    onChange(callback: (data: FooterData) => void): () => void;
}
/**
 * Simple footer data provider with manual updates
 */
export declare class DefaultFooterDataProvider implements FooterDataProvider {
    private data;
    private listeners;
    getData(): FooterData;
    /**
     * Update git info
     */
    setGitInfo(info: GitInfo | undefined): void;
    /**
     * Set extension statuses
     */
    setExtensions(extensions: ExtensionStatus[]): void;
    /**
     * Update session info
     */
    setSession(session: FooterData['session']): void;
    /**
     * Set custom footer item
     */
    setCustom(key: string, value: string): void;
    /**
     * Remove custom footer item
     */
    removeCustom(key: string): void;
    onChange(callback: (data: FooterData) => void): () => void;
    private notify;
}
/**
 * Create default footer data provider
 */
export declare function createFooterDataProvider(): DefaultFooterDataProvider;
/**
 * Simple utility to read git info from command line
 * Used by modes that want to display git status in footer
 */
export declare function getGitInfo(cwd?: string): Promise<GitInfo | null>;
//# sourceMappingURL=footer-data-provider.d.ts.map