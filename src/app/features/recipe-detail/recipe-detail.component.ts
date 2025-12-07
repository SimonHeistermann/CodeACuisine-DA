import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

import {
  GeneratedRecipe,
  RecipeIngredient,
} from './../../core/models/recipe.model';
import { StateService } from './../../core/services/state-service/state.service';
import { FirestoreRecipeService } from './../../core/services/firebase-recipe-service/firebase-recipe.service';

@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './recipe-detail.component.html',
  styleUrl: './recipe-detail.component.scss',
})
export class RecipeDetailComponent implements OnInit {
  selectedRecipe: GeneratedRecipe | null = null;
  chefIndexes: number[] = [];

  private readonly MAX_CHEFS = 6;
  private readonly UNIQUE_BADGES = 4;
  private readonly FAVORITES_STORAGE_KEY = 'cac_favorites';

  isFavorite = false;
  isFavoriteHovered = false;

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly state: StateService,
    private readonly firestoreRecipes: FirestoreRecipeService,
  ) {}

  // ============ Lifecycle ============

  ngOnInit(): void {
    this.initRecipeFromRoute();
    this.initFavoriteState();
  }

  private initRecipeFromRoute(): void {
    const routeIndex = this.activatedRoute.snapshot.paramMap.get('id');
    if (routeIndex === null) return;

    const index = Number(routeIndex);
    if (Number.isNaN(index)) return;

    const recipes = this.state.generatedRecipes ?? [];
    this.selectedRecipe = recipes[index] ?? null;

    const cooks = this.selectedRecipe?.cooksAmount ?? 0;
    const limited = Math.min(cooks, this.MAX_CHEFS);
    this.chefIndexes = Array.from({ length: limited }, (_, i) => i + 1);
  }

  private initFavoriteState(): void {
    if (!this.selectedRecipe) return;

    const signature =
      this.firestoreRecipes.getOrCreateSignature(this.selectedRecipe);

    this.selectedRecipe.recipeSignature = signature;
    this.isFavorite = this.loadFavoriteFromStorage(signature);
    this.isFavoriteHovered = false;

    this.syncLikesFromBackend(this.selectedRecipe);
  }

  // ============ Computed Properties ============

  get hasDietPreference(): boolean {
    const pref = this.selectedRecipe?.preferences?.dietPreferences;
    return !!pref && pref !== 'no preferences';
  }

  get likesCount(): number {
    return this.selectedRecipe?.likes ?? 0;
  }

  // ============ UI Helper ============

  formatIngredientAmount(ingredient: RecipeIngredient): string {
    const amount = ingredient.servingSize;
    const unit = ingredient.unit;
    if (!unit) return `${amount}`;
    if (unit.abbreviation) return `${amount}${unit.abbreviation}`;
    if (unit.name) return `${amount} ${unit.name}`;
    return `${amount}`;
  }

  private mapChefToBadgeIndex(index: number): number {
    if (index <= 0) return 1;

    const normalized =
      ((index - 1) % this.UNIQUE_BADGES + this.UNIQUE_BADGES) %
        this.UNIQUE_BADGES + 1;

    return normalized;
  }

  getChefBadgeModifier(index: number): string {
    const badgeIndex = this.mapChefToBadgeIndex(index);
    return `chef-badge--${badgeIndex}`;
  }

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

  /** Liefert das passende Icon je nach State (normal, hover, clicked) */
  get favoriteIcon(): string {
    if (this.isFavorite) return 'img/heart_green_clicked.png';
    if (this.isFavoriteHovered) return 'img/heart_green_hover.png';
    return 'img/heart_green.png';
  }

  // ============ Favorites / Likes ============

  async onToggleFavorite(): Promise<void> {
    if (!this.selectedRecipe || !this.selectedRecipe.recipeSignature) {
      return;
    }

    const nextState = !this.isFavorite;

    try {
      const likes = await this.firestoreRecipes.updateLikesForRecipe(
        this.selectedRecipe,
        nextState,
      );

      this.isFavorite = nextState;
      this.isFavoriteHovered = false;
      this.updateSelectedRecipeLikes(likes);
      this.saveFavoriteToStorage(
        this.selectedRecipe.recipeSignature,
        nextState,
      );
    } catch (error) {
      console.error('Error updating favorite:', error);
    }
  }

  onFavoriteMouseEnter(): void {
    if (!this.isFavorite) {
      this.isFavoriteHovered = true;
    }
  }

  onFavoriteMouseLeave(): void {
    this.isFavoriteHovered = false;
  }

  private updateSelectedRecipeLikes(likes: number): void {
    if (!this.selectedRecipe) return;
    this.selectedRecipe = {
      ...this.selectedRecipe,
      likes,
    };
  }

  private syncLikesFromBackend(recipe: GeneratedRecipe): void {
    this.firestoreRecipes
      .ensureRecipeInCookbook(recipe)
      .then((updated) => {
        if (!this.selectedRecipe) return;

        this.selectedRecipe = {
          ...this.selectedRecipe,
          likes: updated.likes ?? 0,
          recipeSignature: updated.recipeSignature,
        };
      })
      .catch((error) =>
        console.error('Error syncing recipe from Firestore:', error),
      );
  }

  // ============ LocalStorage ============

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

  private saveFavoriteToStorage(
    signature: string,
    isFavorite: boolean,
  ): void {
    const raw = localStorage.getItem(this.FAVORITES_STORAGE_KEY);
    let data: Record<string, boolean> = {};

    if (raw) {
      try {
        data = JSON.parse(raw) as Record<string, boolean>;
      } catch {
        data = {};
      }
    }

    if (isFavorite) {
      data[signature] = true;
    } else {
      delete data[signature];
    }

    localStorage.setItem(
      this.FAVORITES_STORAGE_KEY,
      JSON.stringify(data),
    );
  }
}