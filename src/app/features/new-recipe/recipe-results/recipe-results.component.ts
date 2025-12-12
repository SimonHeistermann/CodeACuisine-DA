import { Component } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

import {
  GeneratedRecipe,
  RecipeRequirements,
} from '../../../core/models/recipe.model';
import { StateService } from '../../../core/services/state-service/state.service';

@Component({
  selector: 'app-recipe-results',
  standalone: true,
  imports: [CommonModule, RouterModule, TitleCasePipe],
  templateUrl: './recipe-results.component.html',
  styleUrl: './recipe-results.component.scss',
})
/**
 * Displays the list of generated recipe results.
 *
 * Responsibilities:
 * - Render recipes generated in the current session
 * - Display contextual information based on selected requirements
 * - Provide navigation to individual recipe detail views
 *
 * This component is read-only and relies entirely on `StateService`
 * for its data source.
 */
export class RecipeResultsComponent {
  /**
   * Creates the recipe results component.
   *
   * @param state Central application state service.
   * @param router Angular router used for navigation.
   */
  constructor(
    private readonly state: StateService,
    private readonly router: Router,
  ) {}

  /**
   * Returns the list of generated recipes for the current session.
   */
  get recipes(): GeneratedRecipe[] {
    return this.state.generatedRecipes ?? [];
  }

  /**
   * Returns the recipe requirements used to generate the results.
   */
  get requirements(): RecipeRequirements {
    return this.state.recipeRequirements;
  }

  /**
   * Indicates whether a meaningful diet preference was selected.
   *
   * The value `'no preferences'` is treated as not having a diet preference.
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