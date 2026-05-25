// SPDX-License-Identifier: Apache-2.0
/**
 * List available models, optionally filtered by search pattern.
 * Simple implementation: plain text table, no colors.
 */
/** Format a number as human-readable (e.g., 200000 -> "200K", 1M -> "1M") */
function formatTokenCount(count) {
    if (count >= 1_000_000) {
        const millions = count / 1_000_000;
        return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`;
    }
    if (count >= 1_000) {
        const thousands = count / 1_000;
        return thousands % 1 === 0 ? `${thousands}K` : `${thousands.toFixed(1)}K`;
    }
    return count.toString();
}
/**
 * List models from registry, optionally matching a search pattern.
 * This function prints to stdout and does not throw.
 */
export async function listModels(modelRegistry, searchPattern) {
    // Get all models from registry
    const models = modelRegistry.getAll();
    if (models.length === 0) {
        console.log("No models available.");
        return;
    }
    // Filter if search pattern provided (provider or id substring, case-insensitive)
    let filtered = models;
    if (searchPattern) {
        const pattern = searchPattern.toLowerCase();
        filtered = models.filter(m => m.provider.toLowerCase().includes(pattern) || m.id.toLowerCase().includes(pattern));
    }
    if (filtered.length === 0) {
        console.log(`No models matching "${searchPattern}"`);
        return;
    }
    // Sort by provider then id
    filtered.sort((a, b) => {
        const p = a.provider.localeCompare(b.provider);
        if (p !== 0)
            return p;
        return a.id.localeCompare(b.id);
    });
    // Prepare rows
    const rows = filtered.map(m => ({
        provider: m.provider,
        model: m.id,
        context: formatTokenCount(m.contextWindow),
        maxOut: formatTokenCount(m.maxTokens),
        thinking: m.reasoning ? "yes" : "no",
        images: m.input.includes("image") ? "yes" : "no",
    }));
    const headers = {
        provider: "provider",
        model: "model",
        context: "context",
        maxOut: "max-out",
        thinking: "thinking",
        images: "images",
    };
    // Calculate column widths
    const widths = {
        provider: Math.max(headers.provider.length, ...rows.map(r => r.provider.length)),
        model: Math.max(headers.model.length, ...rows.map(r => r.model.length)),
        context: Math.max(headers.context.length, ...rows.map(r => r.context.length)),
        maxOut: Math.max(headers.maxOut.length, ...rows.map(r => r.maxOut.length)),
        thinking: Math.max(headers.thinking.length, ...rows.map(r => r.thinking.length)),
        images: Math.max(headers.images.length, ...rows.map(r => r.images.length)),
    };
    // Format line helper
    const fmt = (obj) => [
        obj.provider.padEnd(widths.provider),
        obj.model.padEnd(widths.model),
        obj.context.padEnd(widths.context),
        obj.maxOut.padEnd(widths.maxOut),
        obj.thinking.padEnd(widths.thinking),
        obj.images.padEnd(widths.images),
    ].join("  ");
    // Output
    console.log(fmt(headers));
    for (const row of rows) {
        console.log(fmt(row));
    }
}
//# sourceMappingURL=list-models.js.map