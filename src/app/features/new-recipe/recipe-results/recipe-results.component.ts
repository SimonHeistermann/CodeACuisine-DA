import { Component } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

import {
  GeneratedRecipe,
  RecipeRequirements,
} from '../../../core/models/recipe.model';
import { StateService } from '../../../core/services/state-service/state.service';

/**
 * Minimal requirements snapshot used by the results UI.
 *
 * This intentionally excludes ingredients so the UI can still display
 * the selected tags even after inputs were reset for the next run.
 */
type RecipeRequirementsSnapshot = Pick<
  RecipeRequirements,
  'cookingTime' | 'cuisine' | 'dietPreferences' | 'portionsAmount' | 'cooksAmount'
>;

@Component({
  selector: 'app-recipe-results',
  standalone: true,
  imports: [CommonModule, RouterModule, TitleCasePipe],
  templateUrl: './recipe-results.component.html',
  styleUrl: './recipe-results.component.scss',
})
/**
 * Displays the list of generated recipes for the most recent successful run.
 *
 * Data sources:
 * - `generatedRecipes` are read from `StateService`
 * - The requirements shown as tags are read from `lastGeneratedRequirements`
 *
 * Responsibilities:
 * - Render generated recipe cards
 * - Render preference tags based on the stored requirements snapshot
 * - Navigate to the recipe detail view for a selected recipe
 */
export class RecipeResultsComponent {
  /**
   * Creates the recipe results component.
   *
   * @param state Central application state service (results + requirements snapshot).
   * @param router Angular router used for navigation.
   */
  constructor(
    private readonly state: StateService,
    private readonly router: Router,
  ) {}

  /**
   * Returns the recipes from the latest successful generation.
   */
  get recipes(): GeneratedRecipe[] {
    return this.state.generatedRecipes ?? [];
  }

  /**
   * Returns the requirements snapshot used for displaying result tags.
   *
   * If no snapshot is available (e.g. direct navigation), a safe empty snapshot
   * is returned to keep template bindings stable.
   */
  get requirements(): RecipeRequirementsSnapshot {
    return (
      this.state.lastGeneratedRequirements ?? {
        cookingTime: '',
        cuisine: '',
        dietPreferences: '',
        portionsAmount: 0,
        cooksAmount: 0,
      }
    );
  }

  /**
   * Indicates whether a meaningful diet preference is selected.
   *
   * `'no preferences'` is treated as "no diet preference".
   */
  get hasDietPreference(): boolean {
    return (
      !!this.requirements.dietPreferences &&
      this.requirements.dietPreferences !== 'no preferences'
    );
  }

  /**
   * Navigates to the detailed view of a selected recipe.
   *
   * @param recipe Selected recipe.
   */
  onViewRecipe(recipe: GeneratedRecipe): void {
    if (!recipe.id) {
      console.warn('Recipe has no Firestore ID – cannot navigate.', recipe);
      return;
    }

    this.router.navigate(['/recipe-results', recipe.id]);
  }
}