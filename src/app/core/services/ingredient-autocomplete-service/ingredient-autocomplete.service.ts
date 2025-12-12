import { Injectable } from '@angular/core';
import { INGREDIENTS } from './../../data/ingredients.data';

/**
 * Internal helper type representing an ingredient candidate with its computed score.
 *
 * Higher `score` means a better match for the user's query.
 */
type ScoredItem = { item: string; score: number };

@Injectable({
  providedIn: 'root',
})
/**
 * Provides lightweight ingredient autocomplete suggestions based on a static ingredient list.
 *
 * Matching strategy:
 * - Exact match and prefix match are rewarded heavily.
 * - Word-prefix and substring matches add additional score.
 * - A small fuzzy match is applied using a Levenshtein distance on a short window.
 * - Longer names receive a small penalty relative to the query length.
 *
 * The result list is sorted by descending score, then alphabetically.
 */
export class IngredientAutocompleteService {
  /** Static list of ingredient names used for matching. */
  private readonly ingredients = INGREDIENTS;

  /**
   * Searches for ingredient suggestions matching the given term.
   *
   * @param term Raw user input (will be trimmed and lowercased).
   * @param limit Maximum number of suggestions to return (default: 3).
   * @returns A list of up to `limit` ingredient strings ordered by best match.
   */
  search(term: string, limit = 3): string[] {
    const query = this.normalizeTerm(term);
    if (!query) return [];
    const scored = this.buildScoredList(query);
    if (scored.length === 0) return [];
    this.sortByScoreThenName(scored);
    return scored.slice(0, limit).map((entry) => entry.item);
  }

  /**
   * Normalizes a user-entered search term.
   *
   * @param term Raw user input.
   * @returns The normalized query string.
   */
  private normalizeTerm(term: string): string {
    return term.trim().toLowerCase();
  }

  /**
   * Builds a scored candidate list for the given query and filters out non-matches.
   *
   * @param query Normalized search query.
   * @returns Candidates with a positive score.
   */
  private buildScoredList(query: string): ScoredItem[] {
    return this.ingredients
      .map((item) => ({ item, score: this.scoreIngredient(item, query) }))
      .filter((entry) => entry.score > 0);
  }

  /**
   * Sorts candidates in-place by best score first; ties are sorted alphabetically.
   *
   * @param scored Array of scored candidates to sort.
   */
  private sortByScoreThenName(scored: ScoredItem[]): void {
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.item.localeCompare(b.item);
    });
  }

  /**
   * Computes the overall match score for an ingredient name against a query.
   *
   * The final score is a sum of multiple heuristics with a small length penalty.
   *
   * @param name Ingredient candidate name.
   * @param query Normalized query string.
   * @returns A numeric score (higher is better).
   */
  private scoreIngredient(name: string, query: string): number {
    const lower = name.toLowerCase();
    let score = 0;
    score += this.scoreExactAndPrefix(lower, query);
    score += this.scoreWordAndSubstring(lower, query);
    score += this.scoreFuzzy(lower, query);
    score -= this.lengthPenalty(lower, query);
    return score;
  }

  /**
   * Scores exact matches and prefix matches.
   *
   * @param name Lowercased ingredient name.
   * @param query Normalized query.
   * @returns Score contribution for exact/prefix matching.
   */
  private scoreExactAndPrefix(name: string, query: string): number {
    if (name === query) return 120;
    if (name.startsWith(query)) return 90;
    return 0;
  }

  /**
   * Scores word-prefix matches and general substring matches.
   *
   * - If any word in the ingredient starts with the query, it receives a higher score.
   * - If the query appears anywhere as a substring, it receives a smaller boost.
   *
   * @param name Lowercased ingredient name.
   * @param query Normalized query.
   * @returns Score contribution for word/substr matching.
   */
  private scoreWordAndSubstring(name: string, query: string): number {
    if (name.split(/\s+/).some((word) => word.startsWith(query))) return 70;
    if (name.includes(query)) return 50;
    return 0;
  }

  /**
   * Applies a small fuzzy match using Levenshtein distance.
   *
   * The distance is computed between the query and a short window from the start of the name.
   * Distances above 3 are treated as non-matches; otherwise a score is awarded.
   *
   * @param name Lowercased ingredient name.
   * @param query Normalized query.
   * @returns Score contribution for fuzzy matching.
   */
  private scoreFuzzy(name: string, query: string): number {
    const window = name.slice(0, Math.max(query.length + 2, query.length));
    const distance = this.levenshtein(query, window);
    if (distance > 3) return 0;
    return Math.max(0, 40 - distance * 10);
  }

  /**
   * Penalizes long ingredient names relative to the query length, capped at 10.
   *
   * This helps shorter, more direct matches appear earlier when other scores are similar.
   *
   * @param name Lowercased ingredient name.
   * @param query Normalized query.
   * @returns A non-negative penalty value (to be subtracted from the score).
   */
  private lengthPenalty(name: string, query: string): number {
    const diff = Math.max(0, name.length - query.length);
    return Math.min(10, diff);
  }

  /**
   * Computes the Levenshtein edit distance between two strings.
   *
   * This implementation uses a single-row dynamic programming approach.
   *
   * @param a First string.
   * @param b Second string.
   * @returns The edit distance (0 means identical).
   */
  private levenshtein(a: string, b: string): number {
    const m = a.length,
      n = b.length;
    if (!m) return n;
    if (!n) return m;
    const dp = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
      let prev = dp[0];
      dp[0] = i;
      for (let j = 1; j <= n; j++) {
        const temp = dp[j],
          cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
        prev = temp;
      }
    }
    return dp[n];
  }

  /**
   * Creates the service.
   *
   * Note: This service currently uses only a static in-memory list and therefore
   * does not require any injected dependencies.
   */
  constructor() {}
}