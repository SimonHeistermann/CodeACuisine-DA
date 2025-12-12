import { CommonModule, TitleCasePipe, Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';

import { GeneratedRecipe } from '../../core/models/recipe.model';
import { StateService } from '../../core/services/state-service/state.service';
import { FirestoreRecipeService } from '../../core/services/firebase-recipe-service/firebase-recipe.service';

@Component({
  selector: 'app-cookbook',
  standalone: true,
  imports: [CommonModule, RouterModule, TitleCasePipe],
  templateUrl: './cookbook.component.html',
  styleUrl: './cookbook.component.scss',
})
/**
 * Displays the cookbook overview page.
 *
 * Responsibilities:
 * - Load all recipes from persistence and derive the most liked ones
 * - Display top-liked recipes and cuisine categories
 * - Provide navigation to recipe detail and cuisine-filtered views
 * - Expose simple UI helpers for likes and conditional rendering
 */
export class CookbookComponent implements OnInit {
  /** List of the most liked recipes shown on the page. */
  topLikedRecipes: GeneratedRecipe[] = [];

  /** Indicates whether the top-liked recipes are currently being loaded. */
  isLoadingTopRecipes = false;

  /** Maximum number of top-liked recipes to display. */
  private readonly NUMBER_OF_TOP_RECIPES = 3;

  /**
   * Creates the cookbook component.
   *
   * @param state Central application state service.
   * @param firestoreRecipeService Service used to load recipes from Firestore.
   * @param router Angular router used for navigation.
   * @param location Angular location service used for back navigation.
   */
  constructor(
    private readonly state: StateService,
    private readonly firestoreRecipeService: FirestoreRecipeService,
    private readonly router: Router,
    private readonly location: Location,
  ) {}

  /**
   * Returns the list of available cuisine options for rendering.
   */
  get cuisines() {
    return this.state.preferencesOptions.cuisine;
  }

  /**
   * Indicates whether at least one top-liked recipe is available.
   */
  get hasTopLikedRecipes(): boolean {
    return this.topLikedRecipes.length > 0;
  }

  /**
   * Angular lifecycle hook.
   *
   * Loads the most liked recipes when the component is initialized.
   */
  ngOnInit(): void {
    this.loadTopLikedRecipes();
  }

  /**
   * Handles clicks on a top-liked recipe card.
   *
   * Navigates to the recipe detail view if a valid recipe id is present.
   *
   * @param recipe Selected recipe.
   */
  onTopRecipeClick(recipe: GeneratedRecipe): void {
    if (!recipe.id) return;
    this.router.navigate(['/cookbook', recipe.id]);
  }

  /**
   * Handles clicks on a cuisine category.
   *
   * Navigates to the cuisine-filtered cookbook view.
   *
   * @param cuisineName Name of the selected cuisine.
   */
  onCuisineClick(cuisineName: string): void {
    this.router.navigate(['/cookbook/cuisine', cuisineName]);
  }

  /**
   * Returns the current number of likes for a recipe.
   *
   * @param recipe Recipe to read likes from.
   * @returns Number of likes (defaults to 0).
   */
  getLikes(recipe: GeneratedRecipe): number {
    return recipe.likes ?? 0;
  }

  /**
   * Loads all recipes and derives the top-liked subset.
   *
   * Sets a loading flag while fetching data and ensures the flag
   * is reset on both success and error.
   */
  private loadTopLikedRecipes(): void {
    this.isLoadingTopRecipes = true;

    this.firestoreRecipeService.loadCookbook().subscribe({
      next: (recipes) => {
        this.topLikedRecipes = this.pickTopLiked(recipes);
        this.isLoadingTopRecipes = false;
      },
      error: (error) => {
        console.error('Error loading cookbook for top liked recipes:', error);
        this.isLoadingTopRecipes = false;
      },
    });
  }

  /**
   * Selects the top liked recipes from the given list.
   *
   * @param recipes All available recipes.
   * @returns A list of the most liked recipes, limited to `NUMBER_OF_TOP_RECIPES`.
   */
  private pickTopLiked(recipes: GeneratedRecipe[]): GeneratedRecipe[] {
    const sorted = [...recipes].sort(
      (a, b) => (b.likes ?? 0) - (a.likes ?? 0),
    );
    return sorted.slice(0, this.NUMBER_OF_TOP_RECIPES);
  }

  /**
   * Navigates back to the previous browser history entry.
   */
  goBack(): void {
    this.location.back();
  }
}