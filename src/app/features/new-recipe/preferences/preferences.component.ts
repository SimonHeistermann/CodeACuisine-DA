import { TitleCasePipe, NgClass } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { GeneratingScreenComponent } from '../generating-screen/generating-screen.component';
import { GenerateRecipeService } from '../../../core/services/generate-recipe-service/generate-recipe.service';

@Component({
  selector: 'app-preferences',
  standalone: true,
  imports: [RouterModule, TitleCasePipe, GeneratingScreenComponent, NgClass],
  templateUrl: './preferences.component.html',
  styleUrl: './preferences.component.scss',
})
export class PreferencesComponent {
  readonly MAX_COUNT = 999;
  readonly MIN_COUNT = 1;

  isLoading = false;

  preferences = {
    times: [
      { value: 'Quick', label: 'Quick', description: 'up to 20min' },
      { value: 'Medium', label: 'Medium', description: '25–40min' },
      { value: 'Complex', label: 'Complex', description: 'over 45min' },
    ],
    cuisine: ['german', 'italian', 'indian', 'japanese', 'gourmet', 'fusion'],
    dietPreferences: ['vegetarian', 'vegan', 'keto', 'no preferences'],
  };

  constructor(public generateRecipeService: GenerateRecipeService) {}

  onGenerateRecipe() {
    const requirements = this.generateRecipeService.recipeRequirements;

    if (
      requirements.cookingTime &&
      requirements.cuisine &&
      requirements.dietPreferences
    ) {
      // hier später: Request an n8n-Service schicken
      this.isLoading = true;
    }
  }

  increaseAmount(key: 'portionsAmount' | 'cooksAmount') {
    const current = this.generateRecipeService.recipeRequirements[key];

    if (current < this.MAX_COUNT) {
      this.generateRecipeService.recipeRequirements[key] = current + 1;
    }
  }

  decreaseAmount(key: 'portionsAmount' | 'cooksAmount') {
    const current = this.generateRecipeService.recipeRequirements[key];

    if (current > this.MIN_COUNT) {
      this.generateRecipeService.recipeRequirements[key] = current - 1;
    }
  }

  selectPreference(
    key: 'cookingTime' | 'cuisine' | 'dietPreferences',
    value: string
  ) {
    this.generateRecipeService.recipeRequirements[key] = value;
  }
}