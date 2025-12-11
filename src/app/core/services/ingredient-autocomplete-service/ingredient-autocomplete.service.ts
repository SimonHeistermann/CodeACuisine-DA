import { Injectable } from '@angular/core';
import { INGREDIENTS } from './../../data/ingredients.data';

type ScoredItem = { item: string; score: number };

@Injectable({
  providedIn: 'root',
})
export class IngredientAutocompleteService {
  private readonly ingredients = INGREDIENTS;

  search(term: string, limit = 3): string[] {
    const query = this.normalizeTerm(term);
    if (!query) return [];
    const scored = this.buildScoredList(query);
    if (scored.length === 0) return [];
    this.sortByScoreThenName(scored);
    return scored.slice(0, limit).map((entry) => entry.item);
  }

  private normalizeTerm(term: string): string {
    return term.trim().toLowerCase();
  }

  private buildScoredList(query: string): ScoredItem[] {
    return this.ingredients
      .map((item) => ({ item, score: this.scoreIngredient(item, query) }))
      .filter((entry) => entry.score > 0);
  }

  private sortByScoreThenName(scored: ScoredItem[]): void {
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.item.localeCompare(b.item);
    });
  }

  private scoreIngredient(name: string, query: string): number {
    const lower = name.toLowerCase();
    let score = 0;
    score += this.scoreExactAndPrefix(lower, query);
    score += this.scoreWordAndSubstring(lower, query);
    score += this.scoreFuzzy(lower, query);
    score -= this.lengthPenalty(lower, query);
    return score;
  }

  private scoreExactAndPrefix(name: string, query: string): number {
    if (name === query) return 120;
    if (name.startsWith(query)) return 90;
    return 0;
  }

  private scoreWordAndSubstring(name: string, query: string): number {
    if (name.split(/\s+/).some((word) => word.startsWith(query))) return 70;
    if (name.includes(query)) return 50;
    return 0;
  }

  private scoreFuzzy(name: string, query: string): number {
    const window = name.slice(0, Math.max(query.length + 2, query.length));
    const distance = this.levenshtein(query, window);
    if (distance > 3) return 0;
    return Math.max(0, 40 - distance * 10);
  }

  private lengthPenalty(name: string, query: string): number {
    const diff = Math.max(0, name.length - query.length);
    return Math.min(10, diff);
  }

  private levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    const dp = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
      let prev = dp[0]; dp[0] = i;
      for (let j = 1; j <= n; j++) {
        const temp = dp[j], cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
        prev = temp;
      }
    }
    return dp[n];
  }
}