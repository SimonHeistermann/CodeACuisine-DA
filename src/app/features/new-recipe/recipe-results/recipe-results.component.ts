import { Component } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { RouterModule } from '@angular/router';

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
  constructor(private readonly state: StateService) {}

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
}