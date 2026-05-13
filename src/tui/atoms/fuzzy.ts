/**
 * Fuzzy Matching Utilities
 * 
 * Provides fuzzy search/filtering for lists.
 * Implements a simple but effective fuzzy matching algorithm.
 */

/**
 * Result of a fuzzy match
 */
export interface FuzzyMatch {
	/** The item being matched */
	item: any;
	/** The match score (lower is better) */
	score: number;
	/** Which characters in the item matched the query */
	matches: number[];
}

/**
 * Options for fuzzy matching
 */
export interface FuzzyOptions {
	/** Minimum score threshold (lower = more matches) */
	threshold?: number;
	/** Whether matching is case sensitive */
	caseSensitive?: boolean;
}

/**
 * Default options
 */
export const FUZZY_DEFAULT_OPTIONS: FuzzyOptions = {
	threshold: 0.6,
	caseSensitive: false,
};

/**
 * Calculate a fuzzy match score between a string and a query.
 * Returns a score where 0 is a perfect match, and higher is worse.
 * Also returns array of matched character indices.
 * 
 * This uses a simple algorithm:
 * - Each character in query must appear in the string in order
 * - Sequential matches (adjacent in both strings) get bonus
 * - Matches at word boundaries get bonus
 * - The more of the query characters that match, the better
 */
export function fuzzyMatch(text: string, query: string, options: FuzzyOptions = {}): { score: number; matches: number[] } | null {
	if (!query || !text) return null;
	
	const opts = { ...FUZZY_DEFAULT_OPTIONS, ...options };
	const caseSensitive = opts.caseSensitive!;
	
	const str = caseSensitive ? text : text.toLowerCase();
	const qry = caseSensitive ? query : query.toLowerCase();
	
	if (qry.length === 0) return { score: 0, matches: [] };
	
	// Find matches in order
	const matches: number[] = [];
	let pos = 0;
	for (let i = 0; i < qry.length; i++) {
		const ch = qry[i];
		let found = false;
		for (; pos < str.length; pos++) {
			if (str[pos] === ch) {
				matches.push(pos);
				pos++;
				found = true;
				break;
			}
		}
		if (!found) {
			return null;
		}
	}

	// Compute score: total gaps (non-matching characters) between consecutive matches
	let totalGap = 0;
	for (let i = 1; i < matches.length; i++) {
		totalGap += matches[i] - matches[i-1] - 1;
	}
	// Normalize by text length to keep in [0,1] range
	const score = totalGap / str.length;

	// Apply threshold
	if (opts.threshold && score > opts.threshold) {
		return null;
	}

	return { score, matches };
}

/**
 * Filter an array of items using fuzzy matching.
 * 
 * @param items Array of items to filter
 * @param query The search query
 * @param getter Function to extract searchable string from an item
 * @param options Fuzzy matching options
 * @returns Array of items that match, sorted by score (best matches first)
 */
export function fuzzyFilter<T>(
	items: T[],
	query: string,
	getter: (item: T) => string,
	options?: FuzzyOptions
): T[] {
	if (!query || query.trim().length === 0) return items;
	
	const results: Array<{ item: T; score: number }> = [];
	
	for (const item of items) {
		const str = getter(item);
		const match = fuzzyMatch(str, query, options);
		if (match) {
			results.push({ item, score: match.score });
		}
	}
	
	// Sort by score (ascending - lower is better)
	results.sort((a, b) => a.score - b.score);
	
	return results.map(r => r.item);
}

/**
 * Highlight matched characters in a string.
 * 
 * @param text The original text
 * @param matches Array of indices that matched
 * @param highlightFn Function to apply highlighting
 * @returns Highlighted string
 */
export function fuzzyHighlight(
	text: string,
	matches: number[],
	highlightFn: (text: string) => string
): string {
	if (!matches || matches.length === 0) return text;
	
	let result = '';
	let lastIdx = 0;
	
	for (const idx of matches) {
		// Add non-matched part
		result += text.slice(lastIdx, idx);
		// Add matched part with highlight
		result += highlightFn(text[idx]);
		lastIdx = idx + 1;
	}
	
	// Add remaining text
	result += text.slice(lastIdx);
	
	return result;
}
