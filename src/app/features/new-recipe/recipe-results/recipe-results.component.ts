import { Component } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { RouterModule } from '@angular/router';

import {
  GeneratedRecipe,
  RecipeRequirements,
} from '../../../core/models/recipe.model';
import { GenerateRecipeService } from '../../../core/services/generate-recipe-service/generate-recipe.service';

@Component({
  selector: 'app-recipe-results',
  standalone: true,
  imports: [CommonModule, RouterModule, TitleCasePipe],
  templateUrl: './recipe-results.component.html',
  styleUrl: './recipe-results.component.scss',
})
export class RecipeResultsComponent {
  constructor(
    private readonly generateRecipeService: GenerateRecipeService,
  ) {}

  get recipes(): GeneratedRecipe[] {
    return this.generateRecipeService.generatedRecipes ?? [];
  }

  get requirements(): RecipeRequirements {
    return this.generateRecipeService.recipeRequirements;
  }

  get hasDietPreference(): boolean {
    return (
      !!this.requirements.dietPreferences &&
      this.requirements.dietPreferences !== 'no preferences'
    );
  }
}