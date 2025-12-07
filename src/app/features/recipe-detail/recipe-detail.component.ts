import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

import {
  GeneratedRecipe,
  RecipeIngredient,
} from './../../core/models/recipe.model';
import { StateService } from './../../core/services/state-service/state.service';

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

  isFavorite = false;
  isFavoriteHovered = false;

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly state: StateService,
  ) {}

  ngOnInit(): void {
    const routeIndex = this.activatedRoute.snapshot.paramMap.get('id');
    if (routeIndex !== null) {
      const recipeIndex = Number(routeIndex);
      if (!Number.isNaN(recipeIndex)) {
        const recipes = this.state.generatedRecipes || [];
        this.selectedRecipe = recipes[recipeIndex] ?? null;

        const cooksAmount = this.selectedRecipe?.cooksAmount ?? 0;
        const limited = Math.min(cooksAmount, this.MAX_CHEFS);
        this.chefIndexes = Array.from({ length: limited }, (_, i) => i + 1);
      }
    }
  }

  get hasDietPreference(): boolean {
    const pref = this.selectedRecipe?.preferences?.dietPreferences;
    return !!pref && pref !== 'no preferences';
  }

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

  get favoriteIcon(): string {
    if (this.isFavorite) {
      return 'img/heart_green_clicked.png';
    }
    if (this.isFavoriteHovered) {
      return 'img/heart_green_hover.png';
    }
    return 'img/heart_green.png';
  }

  /**
   * Toggle favorite state for the current recipe.
   * TODO: Später hier einen Cookbook/Favorites-Service einbinden,
   *       der das Rezept im Cookbook speichert bzw. wieder entfernt.
   */
  onToggleFavorite(): void {
    this.isFavorite = !this.isFavorite;
    this.isFavoriteHovered = false;
  }

  onFavoriteMouseEnter(): void {
    if (!this.isFavorite) {
      this.isFavoriteHovered = true;
    }
  }

  onFavoriteMouseLeave(): void {
    this.isFavoriteHovered = false;
  }
}