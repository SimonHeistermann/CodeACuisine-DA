import { TitleCasePipe, NgClass } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { GeneratingScreenComponent } from '../generating-screen/generating-screen.component';
import { GenerateRecipeService } from '../../../core/services/generate-recipe-service/generate-recipe.service';
import { ToastService } from './../../../core/services/toast-service/toast.service';
import { StateService } from '../../../core/services/state-service/state.service';
import { RecipeRequirements } from '../../../core/models/recipe.model';

@Component({
  selector: 'app-preferences',
  standalone: true,
  imports: [RouterModule, TitleCasePipe, GeneratingScreenComponent, NgClass],
  templateUrl: './preferences.component.html',
  styleUrl: './preferences.component.scss',
})
/**
 * Component responsible for collecting recipe preferences before generation.
 *
 * Responsibilities:
 * - Allow users to configure portions, cooks, cooking time, cuisine and diet preferences
 * - Validate whether all required inputs are present
 * - Trigger the recipe generation flow
 * - Handle loading state and error feedback
 */
export class PreferencesComponent {
  /** Maximum number of portions allowed. */
  readonly MAX_PORTIONS = 999;

  /** Minimum value for numeric counters. */
  readonly MIN_COUNT = 1;

  /** Maximum number of cooks allowed. */
  readonly MAX_COOKS = 6;

  /** Indicates whether recipe generation is currently in progress. */
  isLoading = false;

  /**
   * Creates the preferences component.
   *
   * @param generateRecipeService Service responsible for triggering recipe generation.
   * @param state Central application state service.
   * @param router Angular router used for navigation.
   * @param toastService Service used to show user-facing feedback.
   */
  constructor(
    private readonly generateRecipeService: GenerateRecipeService,
    private readonly state: StateService,
    private readonly router: Router,
    private readonly toastService: ToastService,
  ) {}

  /**
   * Returns the available preference options for rendering the UI.
   */
  get preferences() {
    return this.state.preferencesOptions;
  }

  /**
   * Returns the current recipe requirements from application state.
   */
  get recipeRequirements(): RecipeRequirements {
    return this.state.recipeRequirements;
  }

  /**
   * Indicates whether recipe generation can be triggered.
   *
   * All mandatory preferences must be selected.
   */
  get canGenerateRecipe(): boolean {
    return this.hasAllPreferences();
  }

  /**
   * Handles the "Generate Recipe" action.
   *
   * Ensures ingredients and preferences are present before starting
   * the generation process.
   */
  onGenerateRecipe(): void {
    if (this.hasNoIngredients()) {
      this.navigateToIngredientsWithToast();
      return;
    }
    if (!this.hasAllPreferences()) return;
    this.startRecipeGeneration();
  }

  /**
   * Increases the selected amount for portions or cooks.
   *
   * @param key Target field to increment.
   */
  increaseAmount(key: 'portionsAmount' | 'cooksAmount'): void {
    const current = this.recipeRequirements[key];
    const limit = key === 'cooksAmount' ? this.MAX_COOKS : this.MAX_PORTIONS;

    if (current < limit) {
      this.recipeRequirements[key] = current + 1;
    }
  }

  /**
   * Decreases the selected amount for portions or cooks.
   *
   * @param key Target field to decrement.
   */
  decreaseAmount(key: 'portionsAmount' | 'cooksAmount'): void {
    const current = this.recipeRequirements[key];
    if (current > this.MIN_COUNT) {
      this.recipeRequirements[key] = current - 1;
    }
  }

  /**
   * Selects a preference value for the given preference key.
   *
   * @param key Preference field to update.
   * @param value Selected preference value.
   */
  selectPreference(
    key: 'cookingTime' | 'cuisine' | 'dietPreferences',
    value: string,
  ): void {
    this.recipeRequirements[key] = value;
  }

  /**
   * Checks whether no ingredients have been added yet.
   */
  private hasNoIngredients(): boolean {
    return this.recipeRequirements.ingredients.length === 0;
  }

  /**
   * Checks whether all required preferences are selected.
   */
  private hasAllPreferences(): boolean {
    const req = this.recipeRequirements;
    return !!(req.cookingTime && req.cuisine && req.dietPreferences);
  }

  /**
   * Starts the recipe generation process.
   *
   * Manages loading state, navigation and error handling.
   */
  private startRecipeGeneration(): void {
    this.isLoading = true;

    this.generateRecipeService.generateRecipe().subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/recipe-results']);
      },
      error: (error) => {
        this.handleGenerationError(error);
      },
    });
  }

  /**
   * Handles errors that occur during recipe generation.
   *
   * @param error Error returned by the generation process.
   */
  private handleGenerationError(error: unknown): void {
    console.error('Error generating recipe:', error);
    this.isLoading = false;

    this.router.navigate(['/generate-recipe']).then(() => {
      this.toastService.show({
        title: 'Something went wrong',
        message:
          'We couldn’t generate your recipes right now. Please try again in a moment.',
        durationMs: 5000,
      });
    });
  }

  /**
   * Navigates back to the ingredient input screen and shows a hint toast.
   */
  private navigateToIngredientsWithToast(): void {
    this.router.navigate(['/generate-recipe']).then(() => {
      this.showMissingIngredientsToast();
    });
  }

  /**
   * Shows a toast indicating that at least one ingredient is required.
   */
  private showMissingIngredientsToast(): void {
    this.toastService.show({
      title: 'Ups! Not quite enough…',
      message:
        'Please add at least one ingredient before generating your recipes.',
      durationMs: 4000,
    });
  }
}