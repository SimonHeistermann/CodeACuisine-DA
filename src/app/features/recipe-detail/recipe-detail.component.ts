import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

import { GeneratedRecipe, RecipeIngredient } from './../../core/models/recipe.model';
import { StateService } from './../../core/services/state-service/state.service';
import { FirestoreRecipeService } from './../../core/services/firebase-recipe-service/firebase-recipe.service';

@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './recipe-detail.component.html',
  styleUrl: './recipe-detail.component.scss',
})
/**
 * Displays details for a single recipe, including ingredients, directions and favorites (likes).
 *
 * Data loading strategy:
 * - First attempt: find the recipe in in-memory state (generated recipes or cookbook)
 * - Fallback: fetch the recipe from Firestore by id
 *
 * Favorites strategy:
 * - A recipe is identified for favorites by its deterministic `recipeSignature`
 * - Favorite state is persisted in localStorage
 * - Likes are synced and updated via Firestore (atomic increments)
 *
 * UI features:
 * - "Chef" badges (limited to a max number of icons)
 * - Collapsible sections for ingredients and directions
 * - Hover state for favorite icon
 */
export class RecipeDetailComponent implements OnInit {
  /** The currently displayed recipe (or `null` while not resolved). */
  selectedRecipe: GeneratedRecipe | null = null;

  /** List of indexes used to render "chef" indicators for the cooks amount. */
  chefIndexes: number[] = [];

  /** Maximum number of chef icons to render, regardless of cooks amount. */
  private readonly MAX_CHEFS = 6;

  /** Number of unique badge variants used for cycling chef icons. */
  private readonly UNIQUE_BADGES = 4;

  /** localStorage key used to persist favorites across sessions. */
  private readonly FAVORITES_STORAGE_KEY = 'cac_favorites';

  /** Whether the currently displayed recipe is marked as a favorite locally. */
  isFavorite = false;

  /** Whether the favorite icon is currently hovered (used for UI state). */
  isFavoriteHovered = false;

  /** Whether the ingredients section is expanded. */
  isIngredientsOpen = true;

  /** Whether the directions section is expanded. */
  isDirectionsOpen = true;

  /**
   * Creates the recipe detail component.
   *
   * @param activatedRoute Route service used to read the recipe id parameter.
   * @param state Central application state service used as a first-level cache.
   * @param firestoreRecipes Service used for Firestore reads/writes and signature handling.
   */
  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly state: StateService,
    private readonly firestoreRecipes: FirestoreRecipeService,
  ) {}

  /**
   * Angular lifecycle hook.
   *
   * Reads the recipe id from the route and initializes the component state.
   */
  ngOnInit(): void {
    const id = this.activatedRoute.snapshot.paramMap.get('id');
    if (!id) return;

    this.initRecipeById(id);
  }

  /**
   * Initializes `selectedRecipe` by id.
   *
   * Tries in-memory sources first for responsiveness; if not found, fetches from Firestore.
   * After the recipe is resolved, it triggers post-load initialization (chef icons, favorites).
   *
   * @param id Firestore document id (route param).
   */
  private async initRecipeById(id: string): Promise<void> {
    const fromGenerated = this.state.generatedRecipes?.find((r) => r.id === id) ?? null;

    const fromCookbook = this.state.allRecipes?.find((r) => r.id === id) ?? null;

    this.selectedRecipe = fromGenerated ?? fromCookbook ?? null;

    if (!this.selectedRecipe) {
      try {
        const fromBackend = await this.firestoreRecipes.getRecipeById(id);
        if (!fromBackend) {
          console.warn('Recipe not found for id:', id);
          return;
        }
        this.selectedRecipe = fromBackend;
      } catch (error) {
        console.error('Error loading recipe by id:', error);
        return;
      }
    }

    this.afterRecipeLoaded();
  }

  /**
   * Runs initialization logic that depends on `selectedRecipe` being present.
   *
   * - Builds chef indexes used for rendering icons
   * - Initializes favorite state (localStorage + backend likes sync)
   */
  private afterRecipeLoaded(): void {
    if (!this.selectedRecipe) return;

    this.chefIndexes = this.buildChefIndexes(this.selectedRecipe.cooksAmount);
    this.initFavoriteState();
  }

  /**
   * Creates a list of chef indexes based on the cooks amount and a maximum cap.
   *
   * @param cooksAmount Number of cooks from the recipe.
   * @returns Array of consecutive indices starting at 1.
   */
  private buildChefIndexes(cooksAmount?: number): number[] {
    const cooks = cooksAmount ?? 0;
    const limited = Math.min(cooks, this.MAX_CHEFS);
    return Array.from({ length: limited }, (_, i) => i + 1);
  }

  /**
   * Initializes favorite state for the selected recipe.
   *
   * Steps:
   * - Ensure a deterministic signature exists (and set it on the recipe)
   * - Load favorite state from localStorage
   * - Reset hover state
   * - Sync likes and signature from backend persistence
   */
  private initFavoriteState(): void {
    if (!this.selectedRecipe) return;

    const signature = this.firestoreRecipes.getOrCreateSignature(this.selectedRecipe);

    this.selectedRecipe.recipeSignature = signature;
    this.isFavorite = this.loadFavoriteFromStorage(signature);
    this.isFavoriteHovered = false;

    this.syncLikesFromBackend(this.selectedRecipe);
  }

  /**
   * Indicates whether the selected recipe has a meaningful diet preference.
   *
   * `'no preferences'` is treated as "no diet preference".
   */
  get hasDietPreference(): boolean {
    const pref = this.selectedRecipe?.preferences?.dietPreferences;
    return !!pref && pref !== 'no preferences';
  }

  /**
   * Returns the current likes count for the selected recipe.
   */
  get likesCount(): number {
    return this.selectedRecipe?.likes ?? 0;
  }

  /**
   * Formats an ingredient amount with its unit for display.
   *
   * Formatting rules:
   * - if unit is missing: `{amount}`
   * - if unit has abbreviation: `{amount}{abbr}` (no space)
   * - if unit has name: `{amount} {name}`
   *
   * @param ingredient Ingredient to format.
   * @returns Formatted amount string.
   */
  formatIngredientAmount(ingredient: RecipeIngredient): string {
    const amount = ingredient.servingSize;
    const unit = ingredient.unit;
    if (!unit) return `${amount}`;
    if (unit.abbreviation) return `${amount}${unit.abbreviation}`;
    if (unit.name) return `${amount} ${unit.name}`;
    return `${amount}`;
  }

  /**
   * Maps a chef index to a badge variant index in the range 1..UNIQUE_BADGES.
   *
   * @param index 1-based chef index.
   * @returns Badge index in the range 1..UNIQUE_BADGES.
   */
  private mapChefToBadgeIndex(index: number): number {
    if (index <= 0) return 1;

    const normalized =
      ((index - 1) % this.UNIQUE_BADGES + this.UNIQUE_BADGES) % this.UNIQUE_BADGES + 1;

    return normalized;
  }

  /**
   * Returns the CSS modifier class for a chef badge based on its index.
   *
   * @param index 1-based chef index.
   * @returns CSS class modifier string (e.g. `chef-badge--2`).
   */
  getChefBadgeModifier(index: number): string {
    const badgeIndex = this.mapChefToBadgeIndex(index);
    return `chef-badge--${badgeIndex}`;
  }

  /**
   * Returns the icon path for a chef badge based on its index.
   *
   * @param index 1-based chef index.
   * @returns Asset path for the badge image.
   */
  getChefIcon(index: number): string {
    const badgeIndex = this.mapChefToBadgeIndex(index);

    switch (badgeIndex) {
      case 1:
        return 'img/chef_badge_1.png';
      case 2:
        return 'img/chef_badge_2.png';
      case 3:
        return 'img/chef_badge_3.png';
      case 4:
        return 'img/chef_badge_4.png';
      default:
        return 'img/chef_badge_1.png';
    }
  }

  /**
   * Returns the correct favorite icon path based on current favorite and hover state.
   */
  get favoriteIcon(): string {
    if (this.isFavorite) return 'img/heart_green_clicked.png';
    if (this.isFavoriteHovered) return 'img/heart_green_hover.png';
    return 'img/heart_green.png';
  }

  /**
   * Toggles the visibility of the ingredients section.
   */
  toggleIngredients(): void {
    this.isIngredientsOpen = !this.isIngredientsOpen;
  }

  /**
   * Toggles the visibility of the directions section.
   */
  toggleDirections(): void {
    this.isDirectionsOpen = !this.isDirectionsOpen;
  }

  /**
   * Toggles the favorite state for the selected recipe.
   *
   * This triggers a backend likes update and then applies the new favorite state locally
   * (UI state + localStorage persistence).
   */
  async onToggleFavorite(): Promise<void> {
    if (!this.selectedRecipe || !this.selectedRecipe.recipeSignature) {
      return;
    }

    const nextState = !this.isFavorite;

    try {
      const likes = await this.firestoreRecipes.updateLikesForRecipe(this.selectedRecipe, nextState);

      this.applyFavoriteState(nextState, likes);
    } catch (error) {
      console.error('Error updating favorite:', error);
    }
  }

  /**
   * Applies the favorite state change locally and persists it to localStorage.
   *
   * @param isFavorite New favorite state.
   * @param likes Updated likes count returned by the backend operation.
   */
  private applyFavoriteState(isFavorite: boolean, likes: number): void {
    if (!this.selectedRecipe || !this.selectedRecipe.recipeSignature) {
      return;
    }

    this.isFavorite = isFavorite;
    this.isFavoriteHovered = false;
    this.updateSelectedRecipeLikes(likes);
    this.saveFavoriteToStorage(this.selectedRecipe.recipeSignature, isFavorite);
  }

  /**
   * Sets hover state when entering the favorite button/icon.
   */
  onFavoriteMouseEnter(): void {
    if (!this.isFavorite) {
      this.isFavoriteHovered = true;
    }
  }

  /**
   * Clears hover state when leaving the favorite button/icon.
   */
  onFavoriteMouseLeave(): void {
    this.isFavoriteHovered = false;
  }

  /**
   * Updates the likes count on `selectedRecipe` immutably.
   *
   * @param likes New likes count.
   */
  private updateSelectedRecipeLikes(likes: number): void {
    if (!this.selectedRecipe) return;

    this.selectedRecipe = {
      ...this.selectedRecipe,
      likes,
    };
  }

  /**
   * Ensures the recipe exists in the cookbook and syncs likes/signature/id from Firestore.
   *
   * This helps align the local in-memory representation with the persisted document,
   * especially when a recipe detail view is opened from different entry points.
   *
   * @param recipe Recipe to sync.
   */
  private async syncLikesFromBackend(recipe: GeneratedRecipe): Promise<void> {
    try {
      const updated = await this.firestoreRecipes.ensureRecipeInCookbook(recipe);
      this.applyBackendRecipeUpdate(updated);
    } catch (error) {
      console.error('Error syncing recipe from Firestore:', error);
    }
  }

  /**
   * Applies an updated recipe object (from backend) to the current selected recipe.
   *
   * This updates:
   * - likes (defaulting to 0)
   * - recipeSignature
   * - id (only if the backend provides one, otherwise keeps current id)
   *
   * @param updated Recipe representation returned from Firestore operations.
   */
  private applyBackendRecipeUpdate(updated: GeneratedRecipe): void {
    if (!this.selectedRecipe) return;

    this.selectedRecipe = {
      ...this.selectedRecipe,
      likes: updated.likes ?? 0,
      recipeSignature: updated.recipeSignature,
      id: updated.id ?? this.selectedRecipe.id,
    };
  }

  /**
   * Reads the favorite state for a recipe signature from localStorage.
   *
   * @param signature Deterministic recipe signature.
   * @returns True if the recipe is marked as favorite in localStorage.
   */
  private loadFavoriteFromStorage(signature: string): boolean {
    const raw = localStorage.getItem(this.FAVORITES_STORAGE_KEY);
    if (!raw) return false;

    try {
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      return !!parsed[signature];
    } catch {
      return false;
    }
  }

  /**
   * Persists a favorite/unfavorite action to localStorage.
   *
   * @param signature Deterministic recipe signature.
   * @param isFavorite Whether the recipe should be stored as favorite.
   */
  private saveFavoriteToStorage(signature: string, isFavorite: boolean): void {
    const data = this.loadFavoritesMap();
    this.updateFavoritesMap(data, signature, isFavorite);
    this.persistFavoritesMap(data);
  }

  /**
   * Loads the complete favorites map from localStorage.
   *
   * @returns A map of `{ [recipeSignature]: true }`.
   */
  private loadFavoritesMap(): Record<string, boolean> {
    const raw = localStorage.getItem(this.FAVORITES_STORAGE_KEY);
    if (!raw) return {};

    try {
      return JSON.parse(raw) as Record<string, boolean>;
    } catch {
      return {};
    }
  }

  /**
   * Updates the favorites map in memory.
   *
   * Favorite behavior:
   * - when favorited: set `data[signature] = true`
   * - when unfavorited: remove the key entirely
   *
   * @param data Current favorites map (mutated in place).
   * @param signature Recipe signature key.
   * @param isFavorite Target favorite state.
   */
  private updateFavoritesMap(
    data: Record<string, boolean>,
    signature: string,
    isFavorite: boolean,
  ): void {
    if (isFavorite) {
      data[signature] = true;
    } else {
      delete data[signature];
    }
  }

  /**
   * Writes the favorites map to localStorage.
   *
   * @param data Favorites map to persist.
   */
  private persistFavoritesMap(data: Record<string, boolean>): void {
    localStorage.setItem(this.FAVORITES_STORAGE_KEY, JSON.stringify(data));
  }
}