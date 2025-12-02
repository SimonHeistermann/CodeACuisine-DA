import { TitleCasePipe, NgClass } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
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
      { value: 'quick', label: 'Quick', description: 'up to 20min' },
      { value: 'medium', label: 'Medium', description: '25–40min' },
      { value: 'complex', label: 'Complex', description: 'over 45min' },
    ],
    cuisine: ['german', 'italian', 'indian', 'japanese', 'gourmet', 'fusion'],
    dietPreferences: ['vegetarian', 'vegan', 'keto', 'no preferences'],
  };

  constructor(
    public generateRecipeService: GenerateRecipeService,
    private router: Router
  ) {}

  onGenerateRecipe() {
    const requirements = this.generateRecipeService.recipeRequirements;

    if (
      requirements.cookingTime &&
      requirements.cuisine &&
      requirements.dietPreferences
    ) {
      this.isLoading = true;

      this.generateRecipeService.generateRecipe().subscribe({
        next: (recipes) => {
          this.generateRecipeService.generatedRecipes = recipes;
          this.isLoading = false;
          this.router.navigate(['/recipe-result']);
        },
        error: (error) => {
          console.error('Error generating recipe:', error);
          this.isLoading = false;
          // später: Error-Toast / Meldung einbauen
        },
      });
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