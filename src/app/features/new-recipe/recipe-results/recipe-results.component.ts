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
export class RecipeResultsComponent {
  constructor(
    private readonly state: StateService,
    private readonly router: Router,
  ) {}

  get recipes(): GeneratedRecipe[] {
    return this.state.generatedRecipes ?? [];
  }

  get requirements(): RecipeRequirements {
    return this.state.recipeRequirements;
  }

  get hasDietPreference(): boolean {
    return (
      !!this.requirements.dietPreferences &&
      this.requirements.dietPreferences !== 'no preferences'
    );
  }

  onViewRecipe(recipe: GeneratedRecipe): void {
    if (!recipe.id) {
      console.warn('Recipe has no Firestore ID – cannot navigate.', recipe);
      return;
    }

    this.router.navigate(['/recipe-results', recipe.id]);
  }
}